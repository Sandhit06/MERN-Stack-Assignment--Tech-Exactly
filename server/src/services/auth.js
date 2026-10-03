const { randomBytes, createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, AuthSession, OAuthIdentity } = require('../models');
const env = require('../config/env');
const { AppError, publicUser } = require('../utils/http');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const active = (user) => user && !user.deletedAt && user.status === 'active';
const options = { issuer: 'margin', audience: 'margin-web', algorithm: 'HS256' };
const verifyOptions = { issuer: 'margin', audience: 'margin-web', algorithms: ['HS256'] };
function accessToken(user, session) {
  return jwt.sign(
    { sub: String(user._id), sid: String(session._id), type: 'access' },
    env.JWT_SECRET,
    { ...options, expiresIn: '15m' },
  );
}
function refreshToken(user, session) {
  return jwt.sign(
    {
      sub: String(user._id),
      sid: String(session._id),
      type: 'refresh',
      nonce: randomBytes(24).toString('hex'),
    },
    env.JWT_SECRET,
    { ...options, expiresIn: '7d' },
  );
}
function verify(token, type) {
  try {
    const data = jwt.verify(token, env.JWT_SECRET, verifyOptions);
    if (data.type !== type) throw new Error();
    return data;
  } catch {
    throw new AppError(401, 'INVALID_SESSION', 'Your session has expired. Please sign in again.');
  }
}
async function createSession(user) {
  const session = new AuthSession({
    user: user._id,
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  const token = refreshToken(user, session);
  session.refreshHash = hash(token);
  await session.save();
  return { accessToken: accessToken(user, session), refreshToken: token, user: publicUser(user) };
}
async function register(input) {
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
  });
  return createSession(user);
}
async function login(input) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  // A fixed valid hash keeps unknown-account timing closer to the password comparison path.
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
  );
  if (!active(user) || !valid)
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  return createSession(user);
}
async function refresh(token) {
  const claims = verify(token, 'refresh');
  const user = await User.findById(claims.sub);
  if (!active(user)) throw new AppError(401, 'INVALID_SESSION', 'Please sign in again.');
  const nextToken = refreshToken(user, { _id: claims.sid });
  const session = await AuthSession.findOneAndUpdate(
    {
      _id: claims.sid,
      user: user._id,
      refreshHash: hash(token),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { refreshHash: hash(nextToken), expiresAt: new Date(Date.now() + 7 * 86400000) } },
    { new: true },
  );
  if (!session) {
    await AuthSession.updateOne(
      { _id: claims.sid, user: user._id },
      { $set: { revokedAt: new Date() } },
    );
    throw new AppError(401, 'INVALID_SESSION', 'Session reuse detected. Please sign in again.');
  }
  return {
    accessToken: accessToken(user, session),
    refreshToken: nextToken,
    user: publicUser(user),
  };
}
async function authenticate(token) {
  const claims = verify(token, 'access');
  const [user, session] = await Promise.all([
    User.findById(claims.sub),
    AuthSession.findOne({
      _id: claims.sid,
      user: claims.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }),
  ]);
  if (!active(user) || !session)
    throw new AppError(401, 'INVALID_SESSION', 'Please sign in again.');
  return user;
}
async function logout(token) {
  if (!token) return;
  try {
    const claims = verify(token, 'refresh');
    await AuthSession.updateOne(
      { _id: claims.sid, user: claims.sub },
      { $set: { revokedAt: new Date() } },
    );
  } catch (err) {
    if (err.status !== 401) throw err;
  }
}
async function socialUser(provider, profile) {
  const existing = await OAuthIdentity.findOne({ provider, providerId: profile.id });
  if (existing) {
    const user = await User.findById(existing.user);
    if (!active(user))
      throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
    return user;
  }
  // Provider ID is authoritative. Email is only stored after collision checking, never used to auto-link.
  const email = profile.emails?.[0]?.value?.trim().toLowerCase();
  if (email && (await User.exists({ email })))
    throw new AppError(409, 'ACCOUNT_EXISTS', 'Use your original sign-in method for this email.');
  const user = await User.create({
    name: (profile.displayName || 'Margin reader').slice(0, 60),
    ...(email ? { email } : {}),
  });
  try {
    await OAuthIdentity.create({ provider, providerId: profile.id, user: user._id });
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    if (err.code === 11000) return socialUser(provider, profile);
    throw err;
  }
  return user;
}
module.exports = {
  register,
  login,
  refresh,
  authenticate,
  logout,
  socialUser,
  createSession,
  verify,
};
