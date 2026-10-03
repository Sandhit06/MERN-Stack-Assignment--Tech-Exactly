const db = require('./helpers');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { User, Post, AuthSession, ActivityLog } = require('../src/models');
const auth = require('../src/services/auth');
const { StateStore } = require('../src/config/oauth');
const env = require('../src/config/env');
let app, alice, bob, admin;
const password = 'test-password-123';
const header = (session) => ({
  Authorization: `Bearer ${session.accessToken}`,
  'X-Margin-Client': 'web',
});
const postBody = {
  title: 'A thoughtful first story',
  content: 'This is a complete little story with enough words to share.',
};
async function register(name) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: `${name.toLowerCase()}@example.com`, password });
  expect(response.status).toBe(201);
  return { ...response.body.data, cookie: response.headers['set-cookie'][0].split(';')[0] };
}
beforeAll(db.start);
afterAll(db.stop);
beforeEach(async () => {
  await db.clear();
  app = createApp();
  alice = await register('Alice');
  bob = await register('Bobby');
  admin = await register('Admin');
  await User.updateOne({ _id: admin.user.id }, { role: 'admin' });
});
test('registration validates input, rejects role injection and duplicates, hashes credentials', async () => {
  expect(
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Hacker', email: 'h@example.com', password, role: 'admin' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Alice', email: 'alice@example.com', password })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'A', email: 'bad', password: 'short' })
    ).status,
  ).toBe(400);
  const user = await User.findById(alice.user.id).select('+passwordHash');
  expect(user.passwordHash).not.toBe(password);
  expect(user.passwordHash).toMatch(/^\$2/);
  expect(alice.user.passwordHash).toBeUndefined();
});
test('login and me expose only safe user fields; bad credentials fail', async () => {
  const good = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'alice@example.com', password });
  expect(good.status).toBe(200);
  expect((await request(app).get('/api/v1/auth/me').set(header(alice))).body.data.name).toBe(
    'Alice',
  );
  for (const email of ['alice@example.com', 'unknown@example.com'])
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: 'wrong' })).status,
    ).toBe(401);
  expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
  expect(
    (await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid')).status,
  ).toBe(401);
});
test('refresh rotates, replay revokes the session and logout invalidates existing access', async () => {
  const refreshed = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', alice.cookie)
    .set('X-Margin-Client', 'web');
  expect(refreshed.status).toBe(200);
  expect(refreshed.headers['set-cookie'][0]).not.toBe(alice.cookie);
  const replay = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', alice.cookie)
    .set('X-Margin-Client', 'web');
  expect(replay.status).toBe(401);
  expect((await request(app).get('/api/v1/auth/me').set(header(refreshed.body.data))).status).toBe(
    401,
  );
  expect(
    (
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', bob.cookie)
        .set('X-Margin-Client', 'web')
    ).status,
  ).toBe(200);
  expect((await request(app).get('/api/v1/auth/me').set(header(bob))).status).toBe(401);
  expect((await request(app).post('/api/v1/auth/logout')).status).toBe(200);
  expect((await request(app).post('/api/v1/auth/refresh')).status).toBe(401);
});
test('expired and wrong-type tokens are rejected; cookies are HttpOnly and origin guarded', async () => {
  const token = jwt.sign({ sub: alice.user.id, type: 'access' }, env.JWT_SECRET, {
    expiresIn: -1,
    issuer: 'margin',
    audience: 'margin-web',
  });
  expect(
    (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${alice.cookie.split('=')[1]}`)
    ).status,
  ).toBe(401);
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'alice@example.com', password });
  expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(login.headers['set-cookie'][0]).toContain('SameSite=Lax');
  expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', alice.cookie)).status).toBe(
    403,
  );
  expect(
    (
      await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://evil.example')
        .send({ email: 'alice@example.com', password })
    ).status,
  ).toBe(403);
});
test('post CRUD enforces ownership, unique stable slugs, pagination and soft deletion', async () => {
  const created = await request(app).post('/api/v1/posts').set(header(alice)).send(postBody);
  expect(created.status).toBe(201);
  const post = created.body.data;
  const duplicate = await request(app).post('/api/v1/posts').set(header(alice)).send(postBody);
  expect(duplicate.body.data.slug).not.toBe(post.slug);
  expect(
    (await request(app).patch(`/api/v1/posts/${post.id}`).set(header(bob)).send(postBody)).status,
  ).toBe(404);
  expect((await request(app).delete(`/api/v1/posts/${post.id}`).set(header(bob))).status).toBe(404);
  const changed = await request(app)
    .patch(`/api/v1/posts/${post.id}`)
    .set(header(alice))
    .send({ ...postBody, title: 'A changed title' });
  expect(changed.body.data.slug).toBe(post.slug);
  const list = await request(app).get('/api/v1/posts?limit=1&page=1');
  expect(list.body.data.pagination).toMatchObject({ total: 2, pages: 2, limit: 1 });
  expect(list.body.data.items[0].author.email).toBeUndefined();
  expect((await request(app).get('/api/v1/posts?mine=true')).status).toBe(401);
  expect(
    (await request(app).get('/api/v1/posts?mine=true').set(header(bob))).body.data.items,
  ).toHaveLength(0);
  expect((await request(app).get(`/api/v1/posts/slug/${post.slug}`)).status).toBe(200);
  expect((await request(app).delete(`/api/v1/posts/${post.id}`).set(header(admin))).status).toBe(
    200,
  );
  expect((await Post.findById(post.id)).deletedAt).toBeTruthy();
  expect((await request(app).get(`/api/v1/posts/${post.id}`)).status).toBe(404);
  expect((await request(app).get(`/api/v1/posts/slug/${post.slug}`)).status).toBe(404);
  expect(
    (await request(app).get('/api/v1/admin/posts?deleted=true').set(header(admin))).body.data.items,
  ).toHaveLength(1);
});
test('comments enforce author ownership, parent availability and admin moderation', async () => {
  const post = (await request(app).post('/api/v1/posts').set(header(alice)).send(postBody)).body
    .data;
  const comment = (
    await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set(header(bob))
      .send({ content: 'An interesting perspective.' })
  ).body.data;
  expect(
    (
      await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set(header(alice))
        .send({ content: 'I own the post, not the comment' })
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set(header(bob))
        .send({ content: 'Edited thought' })
    ).body.data.content,
  ).toBe('Edited thought');
  expect(
    (await request(app).get(`/api/v1/posts/${post.id}/comments`)).body.data.pagination.total,
  ).toBe(1);
  expect((await request(app).get('/api/v1/admin/stats').set(header(admin))).body.data).toEqual({
    users: 3,
    posts: 1,
    comments: 1,
  });
  await request(app).delete(`/api/v1/posts/${post.id}`).set(header(alice));
  expect((await request(app).get(`/api/v1/posts/${post.id}/comments`)).status).toBe(404);
  expect(
    (
      await request(app)
        .post(`/api/v1/posts/${post.id}/comments`)
        .set(header(bob))
        .send({ content: 'Hidden' })
    ).status,
  ).toBe(404);
  expect(
    (await request(app).delete(`/api/v1/comments/${comment.id}`).set(header(bob))).status,
  ).toBe(404);
  expect(
    (await request(app).get('/api/v1/admin/stats').set(header(admin))).body.data.comments,
  ).toBe(0);
  const adminComments = await request(app).get('/api/v1/admin/comments').set(header(admin));
  expect(adminComments.body.data.items[0].post.deletedAt).toBeTruthy();
  expect(
    (
      await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set(header(admin))
        .send({ content: 'Moderated' })
    ).status,
  ).toBe(200);
  expect(
    (await request(app).delete(`/api/v1/comments/${comment.id}`).set(header(admin))).status,
  ).toBe(200);
});
test('admin routes reject regular users; disabling users revokes sessions; last admin is protected', async () => {
  for (const path of ['stats', 'users', 'posts', 'comments'])
    expect((await request(app).get(`/api/v1/admin/${path}`).set(header(alice))).status).toBe(403);
  expect(
    (
      await request(app)
        .patch(`/api/v1/admin/users/${admin.user.id}`)
        .set(header(admin))
        .send({ role: 'user' })
    ).status,
  ).toBe(409);
  expect(
    (await request(app).delete(`/api/v1/admin/users/${admin.user.id}`).set(header(admin))).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .patch(`/api/v1/admin/users/${bob.user.id}`)
        .set(header(admin))
        .send({ status: 'disabled' })
    ).status,
  ).toBe(200);
  expect((await request(app).get('/api/v1/auth/me').set(header(bob))).status).toBe(401);
  expect(
    (await request(app).post('/api/v1/auth/login').send({ email: 'bobby@example.com', password }))
      .status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', bob.cookie)
        .set('X-Margin-Client', 'web')
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .patch(`/api/v1/admin/users/${bob.user.id}`)
        .set(header(admin))
        .send({ status: 'active' })
    ).status,
  ).toBe(200);
  expect(
    (await request(app).delete(`/api/v1/admin/users/${bob.user.id}`).set(header(admin))).status,
  ).toBe(200);
  expect(
    (await request(app).get('/api/v1/admin/users?deleted=true').set(header(admin))).body.data
      .pagination.total,
  ).toBe(1);
  expect(
    (await request(app).get('/api/v1/admin/users').set(header(admin))).body.data.pagination.total,
  ).toBe(2);
});
test('invalid payloads, ids, routes, JSON and limits have consistent errors; activity is recorded', async () => {
  for (const path of ['/posts/nope', '/posts?page=-1', '/posts?limit=999', '/missing']) {
    const response = await request(app).get(`/api/v1${path}`);
    expect([400, 404]).toContain(response.status);
    expect(response.body.error.code).toBeTruthy();
  }
  expect(
    (
      await request(app)
        .post('/api/v1/posts')
        .set(header(alice))
        .send({ ...postBody, author: bob.user.id })
    ).status,
  ).toBe(400);
  expect(
    (await request(app).post('/api/v1/posts').set(header(alice)).send({ title: 'No', content: '' }))
      .status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{')
    ).status,
  ).toBe(400);
  for (let i = 0; i < 31; i++) await request(app).post('/api/v1/auth/login').send({});
  expect((await request(app).post('/api/v1/auth/login').send({})).status).toBe(429);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(await ActivityLog.countDocuments({ action: 'auth.register' })).toBeGreaterThan(0);
  expect((await request(app).get('/api/v1/health')).body.data.status).toBe('ok');
});
test('social identities work without email, repeat login, and never auto-link by email', async () => {
  const social = await auth.socialUser('google', {
    id: 'google-123',
    displayName: 'Social Reader',
  });
  const same = await auth.socialUser('google', { id: 'google-123', displayName: 'Changed Name' });
  expect(String(same._id)).toBe(String(social._id));
  await expect(
    auth.socialUser('facebook', { id: 'fb-123', emails: [{ value: 'alice@example.com' }] }),
  ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' });
  await User.updateOne({ _id: social._id }, { status: 'disabled' });
  await expect(auth.socialUser('google', { id: 'google-123' })).rejects.toMatchObject({
    code: 'ACCOUNT_UNAVAILABLE',
  });
  expect((await request(app).get('/api/v1/auth/providers')).body.data).toEqual({
    google: false,
    facebook: false,
  });
  expect((await request(app).get('/api/v1/auth/google')).headers.location).toContain(
    'provider_unavailable',
  );
});
test('OAuth state binds to the browser, expires, and is single-use; PKCE verifier is returned', async () => {
  const store = new StateStore('google');
  let browser;
  const req = {
    res: {
      cookie: (_key, value) => {
        browser = value;
      },
      clearCookie: () => {},
    },
    signedCookies: {},
  };
  const state = await new Promise((resolve, reject) =>
    store.store(req, 'pkce-verifier', null, null, (err, value) =>
      err ? reject(err) : resolve(value),
    ),
  );
  const verify = (value, browserValue) =>
    new Promise((resolve, reject) =>
      store.verify(
        { ...req, signedCookies: { margin_oauth_google: browserValue } },
        value,
        (err, result) => (err ? reject(err) : resolve(result)),
      ),
    );
  expect(await verify(state, 'wrong-browser')).toBe(false);
  expect(await verify(state, browser)).toBe('pkce-verifier');
  expect(await verify(state, browser)).toBe(false);
  expect(await verify(undefined, undefined)).toBe(false);
});
test('concurrent refresh attempts cannot both succeed', async () => {
  const results = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', alice.cookie)
        .set('X-Margin-Client', 'web'),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  expect((await AuthSession.findOne({ user: alice.user.id })).revokedAt).toBeTruthy();
});
