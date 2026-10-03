const auth = require('../services/auth');
const content = require('../services/content');
const admin = require('../services/admin');
const env = require('../config/env');
const { ok, publicUser } = require('../utils/http');
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
};
function sessionResponse(res, session, status = 200) {
  res.cookie('margin_refresh', session.refreshToken, { ...cookieOptions, maxAge: 7 * 86400000 });
  res.locals.actor = session.user.id;
  return ok(res, { user: session.user, accessToken: session.accessToken }, status);
}
exports.cookieOptions = cookieOptions;
exports.sessionResponse = sessionResponse;
exports.register = async (req, res) => sessionResponse(res, await auth.register(req.input), 201);
exports.login = async (req, res) => sessionResponse(res, await auth.login(req.input));
exports.refresh = async (req, res) => {
  try {
    return sessionResponse(res, await auth.refresh(req.cookies.margin_refresh));
  } catch (err) {
    res.clearCookie('margin_refresh', cookieOptions);
    throw err;
  }
};
exports.logout = async (req, res) => {
  await auth.logout(req.cookies.margin_refresh);
  res.clearCookie('margin_refresh', cookieOptions);
  ok(res, { message: 'Signed out.' });
};
exports.me = (req, res) => ok(res, publicUser(req.user));
exports.listPosts = async (req, res) => ok(res, await content.listPosts(req.paging, req.user));
exports.getPost = async (req, res) =>
  ok(
    res,
    await content.getPost(req.params.slug ? { slug: req.params.slug } : { _id: req.params.id }),
  );
exports.createPost = async (req, res) => {
  const post = await content.createPost(req.input, req.user);
  res.locals.target = post.id;
  ok(res, post, 201);
};
exports.updatePost = async (req, res) =>
  ok(res, await content.updatePost(req.params.id, req.input, req.user));
exports.deletePost = async (req, res) => {
  await content.deletePost(req.params.id, req.user);
  ok(res, { message: 'Story deleted.' });
};
exports.listComments = async (req, res) =>
  ok(res, await content.listComments(req.params.postId, req.paging));
exports.createComment = async (req, res) =>
  ok(res, await content.createComment(req.params.postId, req.input, req.user), 201);
exports.updateComment = async (req, res) =>
  ok(res, await content.changeComment(req.params.id, req.input, req.user));
exports.deleteComment = async (req, res) => {
  await content.changeComment(req.params.id, null, req.user, true);
  ok(res, { message: 'Comment deleted.' });
};
exports.stats = async (_req, res) => ok(res, await admin.stats());
exports.users = async (req, res) => ok(res, await admin.users(req.paging));
exports.updateUser = async (req, res) => ok(res, await admin.updateUser(req.params.id, req.input));
exports.deleteUser = async (req, res) => ok(res, await admin.updateUser(req.params.id, {}, true));
exports.adminPosts = async (req, res) =>
  ok(res, await content.listPosts(req.paging, req.user, true));
exports.adminComments = async (req, res) => ok(res, await admin.comments(req.paging));
