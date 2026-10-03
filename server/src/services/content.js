const { randomBytes } = require('node:crypto');
const { Post, Comment } = require('../models');
const { AppError, postView, commentView, pageResult } = require('../utils/http');
const authorFields = 'name deletedAt';
const sort = { createdAt: -1, _id: -1 };
const slugify = (title) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'story';
const ownerFilter = (user) => (user.role === 'admin' ? {} : { author: user._id });
async function listPosts(paging, user, admin = false) {
  if (paging.mine === 'true' && !user)
    throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to view your stories.');
  const filter = {
    deletedAt: admin && paging.deleted === 'true' ? { $ne: null } : null,
    ...(paging.mine === 'true' ? { author: user._id } : {}),
  };
  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort(sort)
      .skip((paging.page - 1) * paging.limit)
      .limit(paging.limit)
      .populate('author', authorFields)
      .lean(),
    Post.countDocuments(filter),
  ]);
  return pageResult(items.map(postView), total, paging.page, paging.limit);
}
async function getPost(filter) {
  const post = await Post.findOne({ ...filter, deletedAt: null })
    .populate('author', authorFields)
    .lean();
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Story not found.');
  return postView(post);
}
async function createPost(input, user) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const post = await Post.create({
        ...input,
        author: user._id,
        slug: slugify(input.title) + (attempt ? `-${randomBytes(4).toString('hex')}` : ''),
      });
      return getPost({ _id: post._id });
    } catch (err) {
      if (err.code !== 11000 || attempt === 3) throw err;
    }
  }
}
async function updatePost(id, input, user) {
  const post = await Post.findOneAndUpdate(
    { _id: id, deletedAt: null, ...ownerFilter(user) },
    { $set: input },
    { new: true, runValidators: true },
  )
    .populate('author', authorFields)
    .lean();
  if (!post)
    throw new AppError(
      404,
      'NOT_FOUND',
      'Story not found or you do not have permission to edit it.',
    );
  return postView(post);
}
async function deletePost(id, user) {
  const post = await Post.findOneAndUpdate(
    { _id: id, deletedAt: null, ...ownerFilter(user) },
    { $set: { deletedAt: new Date() } },
  );
  if (!post)
    throw new AppError(
      404,
      'NOT_FOUND',
      'Story not found or you do not have permission to delete it.',
    );
}
async function listComments(postId, paging) {
  await getPost({ _id: postId });
  const [items, total] = await Promise.all([
    Comment.find({ post: postId })
      .sort(sort)
      .skip((paging.page - 1) * paging.limit)
      .limit(paging.limit)
      .populate('author', authorFields)
      .lean(),
    Comment.countDocuments({ post: postId }),
  ]);
  return pageResult(items.map(commentView), total, paging.page, paging.limit);
}
async function createComment(postId, input, user) {
  await getPost({ _id: postId });
  const comment = await Comment.create({ ...input, post: postId, author: user._id });
  return commentView(await comment.populate('author', authorFields));
}
async function changeComment(id, input, user, remove = false) {
  const comment = await Comment.findOne({ _id: id, ...ownerFilter(user) });
  if (!comment)
    throw new AppError(
      404,
      'NOT_FOUND',
      'Comment not found or you do not have permission to change it.',
    );
  if (user.role !== 'admin') await getPost({ _id: comment.post });
  if (remove) {
    await Comment.deleteOne({ _id: id, ...ownerFilter(user) });
    return;
  }
  comment.content = input.content;
  await comment.save();
  return commentView(await comment.populate('author', authorFields));
}
module.exports = {
  slugify,
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  listComments,
  createComment,
  changeComment,
};
