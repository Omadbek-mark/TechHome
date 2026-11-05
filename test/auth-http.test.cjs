// Real loopback HTTP + session/cookie/CSRF middleware, synthetic members and temp uploads only.
process.env.NODE_ENV = 'test';
process.env.SECRET_TOKEN = 'offline-http-test-key-never-use-for-deployment';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, readdir, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const session = require('express-session');
const sharp = require('sharp');
const mongoose = require('mongoose');
const MemberModel = require('../dist/schema/Member.model').default;
const MemberService = require('../dist/models/Member.service').default;
const createApp = require('../dist/app').default;
const originalLogin = MemberService.prototype.login;
const { loadSecurityConfig } = require('../dist/libs/security/config');
const { HttpError } = require('../dist/libs/security/http');
const origin = 'http://127.0.0.1:3000';
const id = '507f1f77bcf86cd799439011';
const fixture = { _id: id, memberType: 'USER', memberStatus: 'ACTIVE', memberNick: 'fixture', memberPhone: '998901234567', memberPoints: 0, authVersion: 0 };

async function setup(t, production = false) {
  const uploadsRoot = await mkdtemp(path.join(tmpdir(), 'techhome-auth-upload-'));
  const config = { production, origins: [origin, 'http://127.0.0.1:3002'], sessionSecret: 'offline-http-session-key-never-use-for-deployment', trustProxyHops: production ? 1 : 0, uploadsRoot };
  const app = createApp({ config, store: new session.MemoryStore() });
  app.set('views', path.resolve('src/views'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise((done) => server.close(done)); await rm(uploadsRoot, { recursive: true, force: true }); });
  let current = { ...fixture };
  t.mock.method(MemberModel, 'findById', () => ({ exec: async () => current }));
  t.mock.method(MemberService.prototype, 'login', async () => current);
  const agent = request.agent(server);
  const token = async () => (await agent.get('/member/csrf')).body.csrfToken;
  async function login() {
    const csrf = await token();
    const response = await agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', csrf)
      .send({ memberNick: 'fixture', memberPassword: 'fixture-only' }).expect(200);
    return response;
  }
  return { agent, app, config, uploadsRoot, token, login, setMember: (value) => { current = value; } };
}

test('cookie auth returns no JWT or private fields, rotates session and CSRF at login', async (t) => {
  const { agent, token } = await setup(t);
  const before = await agent.get('/member/csrf');
  const result = await agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', before.body.csrfToken).send({}).expect(200);
  assert.equal(result.body.accessToken, undefined);
  assert.equal(result.body.member.authVersion, undefined);
  assert.equal(result.body.member.memberPassword, undefined);
  const cookie = result.headers['set-cookie'].find((value) => value.startsWith('accessToken='));
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\//);
  assert.notEqual(result.body.csrfToken, before.body.csrfToken);
  const beforeSid = before.headers['set-cookie'].find((value) => value.startsWith('techhome.sid='));
  const afterSid = result.headers['set-cookie'].find((value) => value.startsWith('techhome.sid='));
  assert.notEqual(beforeSid.split(';')[0], afterSid.split(';')[0]);
  await agent.get('/member/detail').expect(200);
  await agent.post('/member/update').set('Origin', origin).set('X-CSRF-Token', before.body.csrfToken).send({ memberNick: 'changed' }).expect(403);
  assert.equal(await token(), result.body.csrfToken);
});

test('missing/wrong CSRF, foreign origin and originless writes are rejected before auth work', async (t) => {
  const { agent, token } = await setup(t);
  const csrf = await token();
  await agent.post('/member/login').set('Origin', origin).send({}).expect(403);
  await agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', 'a'.repeat(64)).send({}).expect(403);
  await agent.post('/member/login').set('Origin', 'https://evil.invalid').set('X-CSRF-Token', csrf).send({}).expect(403);
  await agent.post('/member/login').set('X-CSRF-Token', csrf).send({}).expect(403);
  assert.equal(MemberService.prototype.login.mock.callCount(), 0);
  const read = await agent.get('/member/csrf').set('Origin', origin).expect(200);
  assert.equal(read.headers['access-control-allow-origin'], origin);
  assert.equal(read.headers['access-control-allow-credentials'], 'true');
});

test('production refuses plain HTTP and emits Secure HttpOnly session cookies behind configured proxy', async (t) => {
  const { agent } = await setup(t, true);
  await agent.get('/member/csrf').expect(400);
  const result = await agent.get('/member/csrf').set('X-Forwarded-Proto', 'https').expect(200);
  assert.match(result.headers['set-cookie'][0], /Secure/);
  assert.match(result.headers['set-cookie'][0], /HttpOnly/);
});

test('production configuration rejects missing origins, insecure origins and weak secrets', () => {
  assert.throws(() => loadSecurityConfig({ NODE_ENV: 'production', SESSION_SECRET: 'short', SECRET_TOKEN: 'short' }));
  const env = { NODE_ENV: 'production', SESSION_SECRET: 's'.repeat(40), SECRET_TOKEN: 't'.repeat(40), WEB_ORIGINS: 'http://example.invalid', API_ORIGIN: 'https://api.example.invalid' };
  assert.throws(() => loadSecurityConfig(env));
  assert.doesNotThrow(() => loadSecurityConfig({ ...env, WEB_ORIGINS: 'https://example.invalid' }));
});

test('blocked, deleted and revoked members cannot use an already-issued JWT', async (t) => {
  const context = await setup(t);
  await context.login();
  for (const change of [{ memberStatus: 'BLOCK' }, { memberStatus: 'DELETE' }, { authVersion: 1 }]) {
    context.setMember({ ...fixture, ...change });
    await context.agent.get('/member/detail').expect(401);
  }
});

test('logout revokes token version and still clears an expired/absent cookie', async (t) => {
  const context = await setup(t);
  const login = await context.login();
  const oldCookie = login.headers['set-cookie'].find((value) => value.startsWith('accessToken=')).split(';')[0];
  t.mock.method(MemberService.prototype, 'revokeSessions', async () => context.setMember({ ...fixture, authVersion: 1 }));
  const result = await context.agent.post('/member/logout').set('Origin', origin).set('X-CSRF-Token', login.body.csrfToken).send({}).expect(200);
  assert.match(result.headers['set-cookie'].find((value) => value.startsWith('accessToken=')), /Expires=Thu, 01 Jan 1970/);
  await context.agent.get('/member/detail').set('Cookie', oldCookie).expect(401);
  const guestCsrf = await context.token();
  await context.agent.post('/member/logout').set('Origin', origin).set('X-CSRF-Token', guestCsrf).send({}).expect(200);
});

test('public signup always persists USER/ACTIVE/zero points and hashes password', async (t) => {
  const { agent, token } = await setup(t);
  let written;
  t.mock.method(MemberModel, 'create', async (input) => { written = input; return { toJSON: () => ({ ...fixture, ...input }) }; });
  const csrf = await token();
  const response = await agent.post('/member/signup').set('Origin', origin).set('X-CSRF-Token', csrf).send({
    memberNick: 'new-user', memberPhone: '998901234567', memberPassword: 'fixture-password', memberType: 'STORE', memberStatus: 'ACTIVE', memberPoints: 999,
  }).expect(201);
  assert.equal(written.memberType, 'USER'); assert.equal(written.memberPoints, 0); assert.equal(written.authVersion, 0);
  assert.notEqual(written.memberPassword, 'fixture-password');
  assert.equal(response.body.member.memberPassword, undefined);
});

test('profile input cannot update role, points, password or arbitrary image paths', async (t) => {
  const context = await setup(t);
  const login = await context.login();
  let update;
  t.mock.method(MemberModel, 'findByIdAndUpdate', (_filter, value) => { update = value; return { exec: async () => fixture }; });
  await context.agent.post('/member/update').set('Origin', origin).set('X-CSRF-Token', login.body.csrfToken).send({
    memberNick: 'updated', memberType: 'STORE', memberPoints: 999, memberPassword: 'injected', memberImage: '../../evil.svg',
  }).expect(200);
  assert.deepEqual(update.$set, { memberNick: 'updated' });
});

test('admin login requires actual STORE role and open admin signup is removed', async (t) => {
  const context = await setup(t);
  const csrf = await context.token();
  await context.agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf).type('form').send({ memberNick: 'fixture', memberPassword: 'unused' }).expect(403);
  await context.agent.get('/admin/signup').expect(404);
  await context.agent.post('/admin/signup').set('Origin', origin).set('X-CSRF-Token', csrf).send({}).expect(404);
  await context.agent.get('/admin/check-me').expect(401);
});

test('admin session is regenerated, rechecks DB role/status, and logout requires POST + CSRF', async (t) => {
  const context = await setup(t);
  context.setMember({ ...fixture, memberType: 'STORE' });
  const csrf = await context.token();
  await context.agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf).type('form').send({}).expect(302);
  await context.agent.get('/admin/check-me').expect(200);
  await context.agent.get('/admin/logout').expect(404);
  await context.agent.get('/admin/check-me').expect(200);
  await context.agent.post('/admin/logout').set('Origin', origin).send({}).expect(403);
  context.setMember({ ...fixture, memberType: 'USER' });
  await context.agent.get('/admin/check-me').expect(403);
  context.setMember({ ...fixture, memberType: 'STORE', memberStatus: 'BLOCK' });
  await context.agent.get('/admin/check-me').expect(401);
  context.setMember({ ...fixture, memberType: 'STORE' });
  await context.agent.post('/admin/logout').set('Origin', origin).set('X-CSRF-Token', await context.token()).send({}).expect(302);
  await context.agent.get('/admin/check-me').expect(401);
});

test('login rate limit stops attempts before password work', async (t) => {
  const context = await setup(t);
  MemberService.prototype.login.mock.restore();
  const failed = t.mock.method(MemberService.prototype, 'login', async () => { throw new HttpError(401, 'UNAUTHENTICATED', 'Please log in.'); });
  const csrf = await context.token();
  for (let i = 0; i < 10; i++) await context.agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({}).expect(401);
  const response = await context.agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({}).expect(429);
  assert.ok(response.headers['retry-after']); assert.equal(failed.mock.callCount(), 10);
});

test('valid images are decoded/re-encoded with generated safe paths; spoofed and oversized files fail', async (t) => {
  const context = await setup(t);
  const login = await context.login();
  t.mock.method(MemberModel, 'findByIdAndUpdate', (_filter, update) => ({ exec: async () => ({ ...fixture, ...update.$set }) }));
  const png = await sharp({ create: { width: 2, height: 3, channels: 3, background: '#123456' } }).png().toBuffer();
  const send = () => context.agent.post('/member/update').set('Origin', origin).set('X-CSRF-Token', login.body.csrfToken);
  const response = await send().attach('memberImage', png, { filename: '../../payload.svg', contentType: 'image/png' }).expect(200);
  assert.match(response.body.memberImage, /^uploads\/members\/[a-f0-9-]+\.png$/);
  const saved = path.join(context.uploadsRoot, response.body.memberImage.replace('uploads/', ''));
  assert.equal((await sharp(await readFile(saved)).metadata()).width, 2);
  const imageResponse = await context.agent.get('/' + response.body.memberImage).expect(200);
  assert.equal(imageResponse.headers['x-content-type-options'], 'nosniff');
  await context.agent.get('/uploads/members/old-active.svg').expect(404);
  await send().attach('memberImage', Buffer.from('<svg>bad</svg>'), { filename: 'fake.png', contentType: 'image/png' }).expect(415);
  await send().attach('memberImage', png, { filename: 'wrong.svg', contentType: 'image/svg+xml' }).expect(415);
  await send().attach('memberImage', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' }).expect(413);
  assert.equal((await readdir(path.join(context.uploadsRoot, 'members'))).length, 1);
});

after(() => assert.equal(mongoose.connection.readyState, 0));

test('admin HTML login renders a CSRF form and contains no public admin signup link', async (t) => {
  const { agent } = await setup(t);
  const response = await agent.get('/admin/login').expect(200);
  assert.match(response.text, /name="_csrf" value="[a-f0-9]{64}"/);
  assert.doesNotMatch(response.text, /href="\/admin\/signup"/);
});

test('invalid credential objects and overlong bcrypt passwords are rejected without querying MongoDB', async (t) => {
  const { credentials } = require('../dist/libs/security/member-input');
  assert.throws(() => credentials({ memberNick: { $ne: null }, memberPassword: 'fixture-password' }));
  assert.throws(() => credentials({ memberNick: 'valid', memberPassword: '😀'.repeat(19) }, true));
  assert.throws(() => credentials({ memberNick: 'valid', memberPassword: 'short' }, true));
  const service = new MemberService();
  service.memberModel = { findOne: () => { throw new Error('Database must not be queried'); } };
  await assert.rejects(service.login({ memberNick: { $ne: null }, memberPassword: 'fixture' }), (error) => error.status === 400);
});

test('store bootstrap refuses an existing store and never silently changes its role', async () => {
  const service = new MemberService();
  service.memberModel = { findOne: () => ({ exec: async () => ({ ...fixture, memberType: 'STORE' }) }) };
  await assert.rejects(service.bootstrapStore({}), (error) => error.status === 409);
});

test('admin account status updates only target USER and revoke sessions without exposing internal fields', async (t) => {
  const context = await setup(t);
  context.setMember({ ...fixture, memberType: 'STORE' });
  const token = await context.token();
  await context.agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', token).send({}).expect(302);
  let filter, update;
  t.mock.method(MemberModel, 'findOneAndUpdate', (query, changes) => {
    filter = query; update = changes;
    return { exec: async () => ({ ...fixture, memberStatus: 'BLOCK', authVersion: 1 }) };
  });
  const nextToken = await context.token();
  const result = await context.agent.post('/admin/user/edit').set('Origin', origin).set('X-CSRF-Token', nextToken).send({
    _id: id, memberStatus: 'BLOCK', memberType: 'STORE', memberPoints: 999, memberPassword: 'injected',
  }).expect(200);
  assert.equal(filter.memberType, 'USER');
  assert.deepEqual(update, { $set: { memberStatus: 'BLOCK' }, $inc: { authVersion: 1 } });
  assert.equal(result.body.data.authVersion, undefined);
  assert.equal(result.body.data.memberPassword, undefined);
});

test('public error contract returns JSON codes for malformed requests, unknown routes and credentials', async (t) => {
  const context = await setup(t);
  const csrf = await context.token();
  const malformed = await context.agent.post('/member/login').set('Origin', origin).set('Content-Type','application/json').send('{broken').expect(400);
  assert.equal(malformed.body.code, 'INVALID_JSON');
  assert.equal((await context.agent.get('/missing-route').expect(404)).body.code, 'NOT_FOUND');
  const Errors = require('../dist/libs/Errors').default;
  const { Message } = require('../dist/libs/Errors');
  t.mock.method(MemberService.prototype, 'login', async () => { throw new Errors(401, Message.WRONG_PASSWORD); });
  const failed = await context.agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({}).expect(401);
  assert.equal(failed.body.code, 'INVALID_CREDENTIALS');
});


test('login accepts existing names with spaces while signup and malformed input remain validated', () => {
  const { credentials } = require('../dist/libs/security/member-input');
  for (const memberNick of ['Techhome Admin', 'Legacy (Store)', 'Old account '.repeat(5).trim()]) {
    assert.equal(credentials({ memberNick, memberPassword: 'fixture-password' }).memberNick, memberNick);
    assert.throws(() => credentials({ memberNick, memberPassword: 'fixture-password' }, true));
  }
  for (const memberNick of ['bad\nname', '', 'a'.repeat(257), { $ne: null }]) {
    assert.throws(() => credentials({ memberNick, memberPassword: 'fixture-password' }));
  }
});

test('existing spaced STORE name logs into both SPA and admin through real password validation', async t => {
  const context = await setup(t);
  t.mock.method(MemberService.prototype, 'login', originalLogin);
  const bcrypt = require('bcryptjs');
  const current = { ...fixture, memberNick: 'Techhome Admin', memberType: 'STORE', memberPassword: await bcrypt.hash('fixture-password', 4) };
  context.setMember(current);
  t.mock.method(MemberModel, 'findOne', query => {
    assert.equal(query.memberNick, current.memberNick);
    return { exec: async () => current };
  });
  t.mock.method(MemberModel, 'findById', () => ({ exec: async () => current, lean: () => ({ exec: async () => current }) }));
  let csrf = await context.token();
  await context.agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ memberNick: current.memberNick, memberPassword: 'incorrect' }).expect(401);
  const spa = await context.agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ memberNick: current.memberNick, memberPassword: 'fixture-password' }).expect(200);
  assert.equal(spa.body.member.memberNick, current.memberNick);
  assert.equal(spa.body.member.memberPassword, undefined);
  await context.agent.get('/member/detail').expect(200);
  csrf = spa.body.csrfToken;
  const admin = await context.agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf).type('form').send({ memberNick: current.memberNick, memberPassword: 'fixture-password' }).expect(302);
  assert.equal(admin.headers.location, '/admin/product/all');
  await context.agent.get('/admin/check-me').expect(200);
});


test('admin Home and login preserve the current STORE session across Products and Users navigation', async t => {
  const context = await setup(t);
  context.setMember({ ...fixture, memberType: 'STORE' });
  const ProductService = require('../dist/models/Product.service').default;
  t.mock.method(ProductService.prototype, 'getAllProducts', async () => ({ products: [], total: 0, activeCount: 0, pausedCount: 0, deletedCount: 0, lowStockCount: 0 }));
  t.mock.method(MemberService.prototype, 'getAllUsers', async () => ({ users: [], total: 0, activeCount: 0, blockedCount: 0, deletedCount: 0 }));
  const csrf = await context.token();
  await context.agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({}).expect(302);
  for (const path of ['/admin', '/admin/', '/admin/product/all', '/admin/user/all']) {
    const response = await context.agent.get(path).expect(200);
    assert.match(response.text, /href="\/admin\/product\/all"/);
    assert.match(response.text, /href="\/admin\/user\/all"/);
    assert.doesNotMatch(response.text, /href="\/admin\/login"/);
    assert.match(response.text, /action="\/admin\/logout" method="POST"/);
  }
  const login = await context.agent.get('/admin/login').expect(302);
  assert.equal(login.headers.location, '/admin');
  context.setMember({ ...fixture, memberType: 'STORE', memberStatus: 'BLOCK' });
  const guest = await context.agent.get('/admin').expect(200);
  assert.match(guest.text, /href="\/admin\/login"/);
  assert.doesNotMatch(guest.text, /href="\/admin\/user\/all"/);
  await context.agent.get('/admin/check-me').expect(401);
});
