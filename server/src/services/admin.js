const { randomUUID } = require('node:crypto');
const { User, Post, Comment, AuthSession, AdminLock } = require('../models');
const { AppError, publicUser, commentView, pageResult } = require('../utils/http');
async function stats() {
  const [users, posts, comments] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Post.countDocuments({ deletedAt: null }),
    Comment.aggregate([
      { $lookup: { from: 'posts', localField: 'post', foreignField: '_id', as: 'parent' } },
      { $unwind: '$parent' },
      { $match: { 'parent.deletedAt': null } },
      { $count: 'total' },
    ]),
  ]);
  return { users, posts, comments: comments[0]?.total || 0 };
}
async function users(paging) {
  const filter = { deletedAt: paging.deleted === 'true' ? { $ne: null } : null };
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((paging.page - 1) * paging.limit)
      .limit(paging.limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return pageResult(items.map(publicUser), total, paging.page, paging.limit);
}
async function updateUser(id, input, remove = false) {
  const owner = randomUUID();
  // Fail closed during concurrent admin changes. The lock also covers count + update on standalone MongoDB.
  try {
    await AdminLock.updateOne(
      { _id: 'membership' },
      { $setOnInsert: { until: new Date(0) } },
      { upsert: true },
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  const lock = await AdminLock.findOneAndUpdate(
    { _id: 'membership', until: { $lte: new Date() } },
    { $set: { owner, until: new Date(Date.now() + 30000) } },
    { new: true },
  );
  if (!lock)
    throw new AppError(409, 'ADMIN_BUSY', 'Another account change is in progress. Please retry.');
  try {
    const user = await User.findOne({ _id: id, deletedAt: null });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');
    if (
      user.role === 'admin' &&
      user.status === 'active' &&
      (remove || input.role === 'user' || input.status === 'disabled')
    ) {
      if ((await User.countDocuments({ role: 'admin', status: 'active', deletedAt: null })) <= 1)
        throw new AppError(409, 'LAST_ADMIN', 'Keep at least one active admin.');
    }
    if (remove) {
      user.deletedAt = new Date();
      user.status = 'disabled';
    } else Object.assign(user, input);
    await user.save();
    await AuthSession.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    return publicUser(user);
  } finally {
    await AdminLock.updateOne({ _id: 'membership', owner }, { $set: { until: new Date(0) } });
  }
}
async function comments(paging) {
  const [items, total] = await Promise.all([
    Comment.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip((paging.page - 1) * paging.limit)
      .limit(paging.limit)
      .populate('author', 'name deletedAt')
      .populate('post', 'title slug deletedAt')
      .lean(),
    Comment.countDocuments(),
  ]);
  return pageResult(items.map(commentView), total, paging.page, paging.limit);
}
module.exports = { stats, users, updateUser, comments };
