const { randomUUID } = require('node:crypto');
const { ZodError } = require('zod');
const { rateLimit } = require('express-rate-limit');
const auth = require('../services/auth');
const env = require('../config/env');
const { ActivityLog } = require('../models');
const { AppError } = require('../utils/http');
exports.requireAuth = async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
  req.user = await auth.authenticate(token);
  next();
};
exports.requireAdmin = (req, _res, next) => {
  if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin access is required.');
  next();
};
exports.originGuard = (req, _res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.headers.origin && req.headers.origin !== new URL(env.FRONTEND_URL).origin)
      throw new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed.');
    // Browser cookie mutations require a custom header, which cross-origin forms cannot send.
    if (req.cookies?.margin_refresh && req.headers['x-margin-client'] !== 'web')
      throw new AppError(403, 'CSRF_REJECTED', 'Missing request verification header.');
  }
  next();
};
exports.authLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts. Try again in 15 minutes.',
      },
    },
  });
exports.refreshLimiter = () =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many session requests. Please wait a minute.' },
    },
  });
exports.requestLog = (req, res, next) => {
  req.requestId = randomUUID();
  res.set('X-Request-Id', req.requestId);
  res.on('finish', () => {
    if (env.NODE_ENV !== 'test')
      console.log(
        JSON.stringify({
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
        }),
      );
  });
  next();
};
exports.activity = (action) => (req, res, next) => {
  res.on('finish', () => {
    ActivityLog.create({
      actor: req.user?._id || res.locals.actor,
      action,
      target: res.locals.target || req.params.id || req.params.postId,
      outcome: res.statusCode,
      requestId: req.requestId,
    }).catch(() => console.error('Activity log write failed.'));
  });
  next();
};
exports.errorHandler = (err, req, res, _next) => {
  let status = err.status || 500,
    code = err.code || 'INTERNAL_ERROR',
    message = err.message;
  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.issues.map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`).join(' ');
  }
  if (err.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    message = 'An account or resource with these details already exists.';
  }
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid resource ID.';
  }
  if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body must contain valid JSON.';
  }
  if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large.';
  }
  if (status >= 500) {
    message = 'Something went wrong. Please try again.';
    code = 'INTERNAL_ERROR';
    console.error(JSON.stringify({ requestId: req.requestId, error: err.name }));
  }
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
};
