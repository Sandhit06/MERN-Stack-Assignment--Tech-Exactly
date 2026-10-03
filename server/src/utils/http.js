class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const publicUser = (user) => ({
  id: String(user._id),
  name: user.deletedAt ? 'Deleted account' : user.name,
  ...(user.deletedAt ? {} : { email: user.email }),
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  deletedAt: user.deletedAt,
});
const authorView = (user) =>
  user
    ? { id: String(user._id), name: user.deletedAt ? 'Deleted account' : user.name }
    : { id: '', name: 'Deleted account' };
const postView = (doc) => ({
  id: String(doc._id),
  title: doc.title,
  content: doc.content,
  slug: doc.slug,
  author: authorView(doc.author),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  deletedAt: doc.deletedAt,
});
const commentView = (doc) => ({
  id: String(doc._id),
  content: doc.content,
  author: authorView(doc.author),
  post:
    doc.post?.title !== undefined
      ? {
          id: String(doc.post._id),
          title: doc.post.title,
          slug: doc.post.slug,
          deletedAt: doc.post.deletedAt,
        }
      : String(doc.post),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});
const ok = (res, data, status = 200) => res.status(status).json({ data });
const pageResult = (items, total, page, limit) => ({
  items,
  pagination: { page, limit, total, pages: Math.ceil(total / limit) },
});
module.exports = { AppError, publicUser, authorView, postView, commentView, ok, pageResult };
