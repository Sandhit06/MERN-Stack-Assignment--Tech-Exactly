const { randomBytes, createHash } = require('node:crypto');
const { Passport } = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const env = require('./env');
const auth = require('../services/auth');
const { OAuthState } = require('../models');
const passport = new Passport();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const cookie = {
  httpOnly: true,
  signed: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: 600000,
};
class StateStore {
  constructor(provider) {
    this.key = `margin_oauth_${provider}`;
  }
  store(req, verifier, _state, _meta, done) {
    const handle = randomBytes(32).toString('hex'),
      browser = randomBytes(32).toString('hex');
    OAuthState.create({
      _id: hash(handle),
      browserHash: hash(browser),
      verifier,
      expiresAt: new Date(Date.now() + 600000),
    }).then(() => {
      req.res.cookie(this.key, browser, cookie);
      done(null, handle);
    }, done);
  }
  verify(req, state, done) {
    const browser = req.signedCookies[this.key];
    req.res.clearCookie(this.key, cookie);
    if (typeof state !== 'string' || typeof browser !== 'string') return done(null, false);
    OAuthState.findOneAndDelete({
      _id: hash(state),
      browserHash: hash(browser),
      expiresAt: { $gt: new Date() },
    }).then((record) => done(null, record ? record.verifier || true : false), done);
  }
}
const providers = {
  google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL),
  facebook: !!(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET && env.FACEBOOK_CALLBACK_URL),
};
const verify = (provider) => (_access, _refresh, profile, done) =>
  auth.socialUser(provider, profile).then((user) => done(null, user), done);
if (providers.google)
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        state: true,
        pkce: true,
        store: new StateStore('google'),
      },
      verify('google'),
    ),
  );
if (providers.facebook)
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_CLIENT_ID,
        clientSecret: env.FACEBOOK_CLIENT_SECRET,
        callbackURL: env.FACEBOOK_CALLBACK_URL,
        state: true,
        store: new StateStore('facebook'),
        profileFields: ['id', 'displayName', 'emails'],
        enableProof: true,
      },
      verify('facebook'),
    ),
  );
module.exports = { passport, providers, StateStore };
