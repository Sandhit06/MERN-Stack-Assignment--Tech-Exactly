const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = (model) => ({ type: Schema.Types.ObjectId, ref: model, required: true });
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
const postSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: ref('User'),
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
postSchema.index({ deletedAt: 1, createdAt: -1, _id: -1 });
postSchema.index({ author: 1, deletedAt: 1, createdAt: -1, _id: -1 });
const commentSchema = new Schema(
  { content: { type: String, required: true }, post: ref('Post'), author: ref('User') },
  { timestamps: true },
);
commentSchema.index({ post: 1, createdAt: -1, _id: -1 });
const sessionSchema = new Schema(
  {
    user: ref('User'),
    refreshHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1 });
const identitySchema = new Schema(
  {
    provider: { type: String, enum: ['google', 'facebook'], required: true },
    providerId: { type: String, required: true },
    user: ref('User'),
  },
  { timestamps: true },
);
identitySchema.index({ provider: 1, providerId: 1 }, { unique: true });
const logSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    action: String,
    target: String,
    outcome: Number,
    requestId: String,
  },
  { timestamps: true },
);
logSchema.index({ createdAt: -1 });
// A singleton lock serializes admin membership changes across API processes.
const lockSchema = new Schema({ _id: String, owner: String, until: Date });
const oauthStateSchema = new Schema({
  _id: String,
  browserHash: String,
  verifier: String,
  expiresAt: Date,
});
oauthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = {
  User: mongoose.model('User', userSchema),
  Post: mongoose.model('Post', postSchema),
  Comment: mongoose.model('Comment', commentSchema),
  AuthSession: mongoose.model('AuthSession', sessionSchema),
  OAuthIdentity: mongoose.model('OAuthIdentity', identitySchema),
  ActivityLog: mongoose.model('ActivityLog', logSchema),
  AdminLock: mongoose.model('AdminLock', lockSchema),
  OAuthState: mongoose.model('OAuthState', oauthStateSchema),
};
