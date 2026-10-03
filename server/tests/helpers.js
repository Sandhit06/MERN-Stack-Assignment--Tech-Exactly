process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-signing-secret-at-least-32-characters';
process.env.COOKIE_SECRET = 'test-only-cookie-secret-at-least-32-characters';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/margin_test';
process.env.GOOGLE_CLIENT_ID = '';
process.env.FACEBOOK_CLIENT_ID = '';
const path = require('node:path');
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../../.local/mongodb-binaries');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const models = require('../src/models');
let db;
async function start() {
  db = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { dbName: 'margin_test' },
  });
  await mongoose.connect(db.getUri('margin_test'));
  await Promise.all(Object.values(models).map((model) => model.init()));
}
async function clear() {
  if (mongoose.connection.name !== 'margin_test')
    throw new Error('Refusing test cleanup outside margin_test.');
  await Promise.all(Object.values(models).map((model) => model.deleteMany({})));
}
async function stop() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await mongoose.disconnect();
  if (db) await db.stop();
}
module.exports = { start, clear, stop };
