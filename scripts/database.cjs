// Optional local MongoDB runner. Real MongoDB, persisted to .local/data; no Windows service needed.
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
process.env.MONGOMS_DOWNLOAD_DIR = path.join(root, '.local', 'mongodb-binaries');
const { MongoMemoryServer } = require('mongodb-memory-server');
(async () => {
  const dbPath = path.join(root, '.local', 'data');
  fs.mkdirSync(dbPath, { recursive: true });
  const db = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { port: 27017, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
  });
  console.log(`Margin local MongoDB: ${db.getUri()} (persistent: ${dbPath})`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await db.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
