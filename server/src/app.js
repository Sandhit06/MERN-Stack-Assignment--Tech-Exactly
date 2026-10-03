const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { passport } = require('./config/oauth');
const m = require('./middleware');
const { AppError } = require('./utils/http');
function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(
    m.requestLog,
    express.json({ limit: '100kb' }),
    cookieParser(env.COOKIE_SECRET),
    m.originGuard,
    passport.initialize(),
  );
  app.get('/api/v1/health', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ data: { status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable' } }),
  );
  app.use('/api/v1', require('./routes')());
  app.use('/api', (_req, _res) => {
    throw new AppError(404, 'NOT_FOUND', 'API route not found.');
  });
  const dist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((_req, _res) => {
    throw new AppError(404, 'NOT_FOUND', 'Route not found.');
  });
  app.use(m.errorHandler);
  return app;
}
module.exports = { createApp };
