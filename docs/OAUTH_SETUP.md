# Connecting Google and Facebook

Email login works before this setup. Provider buttons are enabled only when the API sees a nonempty client ID, client secret, and callback URL for that provider. These booleans indicate configuration, not a completed provider verification.

## Shared setup rules

1. Keep the app running at `http://localhost:5173`.
2. Put provider secrets only in the root `.env`.
3. Register the exact callback URLs shown below. Scheme, hostname, port, path and trailing slash must match.
4. Restart the API after editing `.env`.
5. Use permitted test accounts while the provider app is in testing/development mode.

Local callbacks intentionally use port 5173. Vite forwards `/api` to the API on port 5000, keeping browser cookies on the same origin. Do not interchange `localhost` and `127.0.0.1` in the browser.

## Google

1. Open Google Cloud Console under your own account and select/create a project.
2. Configure the OAuth consent setup and test users as required by the console.
3. Create an OAuth client of type **Web application**.
4. Add this authorized redirect URI:

```text
http://localhost:5173/api/v1/auth/google/callback
```

5. Copy the client ID and secret to `.env`:

```dotenv
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5173/api/v1/auth/google/callback
```

The app requests `profile` and `email`, uses the authorization-code flow, and uses PKCE S256. It identifies accounts by Google's provider ID. It does not request Google API access beyond sign-in.

Official guidance: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Passport Google strategy](https://www.passportjs.org/packages/passport-google-oauth20/).

## Facebook / Meta

1. Open Meta for Developers under your account and create/configure an app supporting Facebook Login for the web.
2. Configure its login use case, app settings, and permitted developer/test accounts according to the current dashboard.
3. Register the callback URL where supported by your app's configuration:

```text
http://localhost:5173/api/v1/auth/facebook/callback
```

4. Add these `.env` values:

```dotenv
FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5173/api/v1/auth/facebook/callback
```

The app uses Passport's Facebook strategy, requests email, enables app-secret proof, and identifies the person by provider ID. A missing email is supported; users without email still have a provider-linked account. Facebook uses browser-bound single-use state; this implementation does not claim Facebook PKCE support.

Meta's settings and HTTPS/test-account requirements depend on the current app configuration. Its live documentation was not retrievable during this build. If HTTP localhost is rejected, use a configured HTTPS development origin/tunnel, update `FRONTEND_URL` and the callback to that same origin, and register the exact HTTPS callback. Do not weaken state validation to work around a redirect error. Public login can require additional provider settings/review beyond local test access.

Reference: [Passport Facebook strategy](https://www.passportjs.org/packages/passport-facebook/), [Meta developer portal](https://developers.facebook.com/).

## What happens after the provider redirects back?

1. Passport exchanges the authorization code and receives the provider profile.
2. The state store checks the initiating browser and consumes the state exactly once. Expired states are rejected.
3. Margin finds/creates an account by provider and provider ID.
4. If another account already has that email, Margin asks you to use the original sign-in method. It never auto-merges accounts by email. Explicit account linking is not implemented.
5. Margin creates its own session, sets the HttpOnly refresh cookie, and redirects to `/auth/callback`.
6. The frontend restores the session using the refresh endpoint. No app JWT is put in a redirect URL.

## Required manual verification before claiming real OAuth works

- [ ] Google login succeeds with an allowed test user.
- [ ] Facebook login succeeds with an allowed test user.
- [ ] A second login finds the same local account, rather than creating a duplicate.
- [ ] Cancelling provider consent returns a useful login error.
- [ ] Reload preserves the local session; logout removes access.
- [ ] Signing in with an email already registered through another method does not merge accounts.
- [ ] No token or secret appears in the redirect URL or browser logs.

Automated tests cover provider identity rules and the state store. They do not simulate a complete real provider exchange or replace these manual checks. No provider credentials were supplied for this build, so live provider checks remain pending.
