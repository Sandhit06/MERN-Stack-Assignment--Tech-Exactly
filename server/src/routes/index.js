const { Router } = require('express');
const c = require('../controllers');
const v = require('../validators');
const m = require('../middleware');
const auth = require('../services/auth');
const { passport, providers } = require('../config/oauth');
const env = require('../config/env');
const { ok } = require('../utils/http');
module.exports = function routes() {
  const root = Router(),
    authentication = Router(),
    posts = Router(),
    comments = Router(),
    admin = Router();
  const strictLimit = m.authLimiter(),
    refreshLimit = m.refreshLimiter();
  authentication.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  authentication.get('/providers', (_req, res) => ok(res, providers));
  authentication.post(
    '/register',
    strictLimit,
    m.activity('auth.register'),
    v.validate(v.register),
    c.register,
  );
  authentication.post(
    '/login',
    strictLimit,
    m.activity('auth.login'),
    v.validate(v.login),
    c.login,
  );
  authentication.post('/refresh', refreshLimit, c.refresh);
  authentication.post('/logout', refreshLimit, m.activity('auth.logout'), c.logout);
  authentication.get('/me', m.requireAuth, c.me);
  for (const provider of ['google', 'facebook']) {
    const available = (_req, res, next) =>
      providers[provider]
        ? next()
        : res.redirect(`${env.FRONTEND_URL}/login?error=provider_unavailable`);
    authentication.get(
      `/${provider}`,
      strictLimit,
      available,
      passport.authenticate(provider, {
        session: false,
        scope: provider === 'google' ? ['profile', 'email'] : ['email'],
      }),
    );
    authentication.get(
      `/${provider}/callback`,
      strictLimit,
      available,
      m.activity(`auth.${provider}`),
      (req, res, next) => {
        passport.authenticate(provider, { session: false }, async (err, user) => {
          if (err || !user)
            return res.redirect(
              `${env.FRONTEND_URL}/login?error=${err?.code === 'ACCOUNT_EXISTS' ? 'account_exists' : 'oauth_failed'}`,
            );
          try {
            const session = await auth.createSession(user);
            res.cookie('margin_refresh', session.refreshToken, {
              ...c.cookieOptions,
              maxAge: 7 * 86400000,
            });
            res.locals.actor = user._id;
            res.redirect(`${env.FRONTEND_URL}/auth/callback`);
          } catch (error) {
            next(error);
          }
        })(req, res, next);
      },
    );
  }
  posts.get(
    '/',
    v.pagination,
    (req, res, next) => (req.paging.mine === 'true' ? m.requireAuth(req, res, next) : next()),
    c.listPosts,
  );
  posts.get('/slug/:slug', c.getPost);
  posts.get('/:id', v.idParam, c.getPost);
  posts.post('/', m.requireAuth, m.activity('post.create'), v.validate(v.post), c.createPost);
  posts.patch(
    '/:id',
    m.requireAuth,
    v.idParam,
    m.activity('post.update'),
    v.validate(v.post),
    c.updatePost,
  );
  posts.delete('/:id', m.requireAuth, v.idParam, m.activity('post.delete'), c.deletePost);
  posts.get('/:postId/comments', v.idParam, v.pagination, c.listComments);
  posts.post(
    '/:postId/comments',
    m.requireAuth,
    v.idParam,
    m.activity('comment.create'),
    v.validate(v.comment),
    c.createComment,
  );
  comments.patch(
    '/:id',
    m.requireAuth,
    v.idParam,
    m.activity('comment.update'),
    v.validate(v.comment),
    c.updateComment,
  );
  comments.delete('/:id', m.requireAuth, v.idParam, m.activity('comment.delete'), c.deleteComment);
  admin.use(m.requireAuth, m.requireAdmin);
  admin.get('/stats', c.stats);
  admin.get('/users', v.pagination, c.users);
  admin.patch(
    '/users/:id',
    v.idParam,
    m.activity('user.update'),
    v.validate(v.userUpdate),
    c.updateUser,
  );
  admin.delete('/users/:id', v.idParam, m.activity('user.delete'), c.deleteUser);
  admin.get('/posts', v.pagination, c.adminPosts);
  admin.get('/comments', v.pagination, c.adminComments);
  root.use('/auth', authentication);
  root.use('/posts', posts);
  root.use('/comments', comments);
  root.use('/admin', admin);
  return root;
};
