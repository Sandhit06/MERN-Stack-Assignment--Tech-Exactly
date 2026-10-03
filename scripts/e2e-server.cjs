// Starts a completely isolated database and a built-client API server for browser tests.
const path = require('node:path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-e2e-jwt-secret-not-for-production';
process.env.COOKIE_SECRET = 'isolated-e2e-cookie-secret-not-for-production';
process.env.FRONTEND_URL = 'http://localhost:5100';
process.env.GOOGLE_CLIENT_ID = '';
process.env.FACEBOOK_CLIENT_ID = '';
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../.local/mongodb-binaries');
const { MongoMemoryServer } = require('mongodb-memory-server');
(async () => {
  const db = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { dbName: 'margin_e2e' },
  });
  process.env.MONGODB_URI = db.getUri('margin_e2e');
  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  await require('../server/src/config/database').connect();
  const { User, Post } = require('../server/src/models');
  await Promise.all([User.init(), Post.init()]);
  await User.create({
    name: 'Test Editor',
    email: 'editor@example.test',
    passwordHash: await bcrypt.hash('e2e-editor-password', 12),
    role: 'admin',
  });
  const author = await User.create({
    name: 'Sample Author',
    email: 'sample@example.test',
    passwordHash: await bcrypt.hash('e2e-author-password', 12),
  });
  await Post.create({
    title: 'Welcome to the reading room',
    slug: 'welcome-to-the-reading-room',
    content:
      'A small story to begin the conversation. There is always room for another thoughtful perspective.\n\nTake your time, read generously, and make yourself at home.',
    author: author._id,
  });
  const server = require('../server/src/app')
    .createApp()
    .listen(5100, '127.0.0.1', () => console.log('Isolated browser test server ready.'));
  const stop = () =>
    server.close(async () => {
      await mongoose.disconnect();
      await db.stop();
      process.exit(0);
    });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
