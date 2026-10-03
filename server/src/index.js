const mongoose = require('mongoose');
const { connect } = require('./config/database');
const env = require('./config/env');
const { createApp } = require('./app');
connect()
  .then(() => {
    const server = createApp().listen(env.PORT, '127.0.0.1', () =>
      console.log(`Margin API: http://localhost:${env.PORT}/api/v1`),
    );
    const shutdown = () =>
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error(`Cannot start Margin: ${err.message}`);
    process.exit(1);
  });
