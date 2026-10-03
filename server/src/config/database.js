const mongoose = require('mongoose');
const env = require('./env');
exports.connect = () => mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
