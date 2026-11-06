// No dotenv/app/server imports: all persistence is stubbed; no sockets or live DB.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OrderService = require('../dist/models/Order.service').default;
const MemberService = require('../dist/models/Member.service').default;
const ProductService = require('../dist/models/Product.service').default;
const AuthService = require('../dist/models/Auth.service').default;
const OrderItem = require('../dist/schema/OrderItem.model').default;

const id = '507f1f77bcf86cd799439011';
const otherId = '507f191e810c19729de860ea';
const member = { _id: id, memberNick: 'test-fixture', memberType: 'USER' };

test('order lookup is scoped to authenticated member and requested status', async () => {
  const service = new OrderService();
  let pipeline;
  service.orderModel = { aggregate: (input) => {
    pipeline = input;
    return { exec: async () => [] };
  } };
  assert.deepEqual(await service.getMyOrders(member, { page: 2, limit: 5, orderStatus: 'PAUSE' }), []);
  assert.equal(String(pipeline[0].$match.memberId), id);
  assert.equal(pipeline[0].$match.orderStatus, 'PAUSE');
  assert.equal(pipeline.find((step) => '$skip' in step).$skip, 5);
});

test('login rejects a blocked account before checking its password', async () => {
  const service = new MemberService();
  service.memberModel = { findOne: () => ({ exec: async () => ({ memberStatus: 'BLOCK', memberPassword: 'fixture-hash' }) }) };
  await assert.rejects(service.login({ memberNick: 'fixture', memberPassword: 'unused' }),
    (error) => error.code === 403);
});

test('signup hashes the password and removes it from its response', async () => {
  const service = new MemberService();
  let savedHash;
  service.memberModel = { create: async (input) => {
    savedHash = input.memberPassword;
    return { ...input, toJSON() { return { memberPassword: this.memberPassword }; } };
  } };
  const result = await service.signup({ memberNick: 'fixture', memberPhone: '998901234567', memberPassword: 'fixture-only' });
  assert.notEqual(savedHash, 'fixture-only');
  assert.equal(await bcrypt.compare('fixture-only', savedHash), true);
  assert.equal(result.memberPassword, undefined);
});

test('public catalog only queries active products and keeps category filtering', async () => {
  const service = new ProductService();
  let pipeline;
  service.productModel = { aggregate: (input) => {
    pipeline = input;
    return { exec: async () => [{ _id: id }] };
  } };
  await service.getProducts({ page: 1, limit: 4, order: 'productPrice', productCategory: 'KITCHEN' });
  assert.equal(pipeline[0].$match.productStatus, 'PROCESS');
  assert.equal(pipeline[0].$match.productCategory, 'KITCHEN');
  assert.deepEqual(pipeline[1].$sort, { productPrice: 1, _id: 1 });
});

test('JWT round trip expires after the configured duration and rejects tampering', async () => {
  const previous = process.env.SECRET_TOKEN;
  process.env.SECRET_TOKEN = 'offline-test-secret-not-a-deployment-credential';
  try {
    const service = new AuthService();
    service.memberService = { getAuthenticatedMember: async () => member };
    const token = await service.createToken(member);
    const payload = await service.checkAuth(token);
    assert.equal(payload._id, id);
    const claims = jwt.decode(token);
    assert.equal(claims.exp - claims.iat, 24 * 3600);
    assert.equal(claims.sub, id);
    assert.equal(claims.memberPhone, undefined);
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ ...payload, memberType: 'STORE' })).toString('base64url');
    await assert.rejects(service.checkAuth(parts.join('.')));
    const expired = jwt.sign({ _id: id }, process.env.SECRET_TOKEN, { expiresIn: -1 });
    await assert.rejects(service.checkAuth(expired));
  } finally {
    if (previous === undefined) delete process.env.SECRET_TOKEN;
    else process.env.SECRET_TOKEN = previous;
  }
});

// Executable desired-behavior regressions, explicitly TODO until their approved stage.
// These are not passing security checks; remove TODO only with the corresponding fix.
test('public signup ignores client-supplied STORE role', async () => {
  const service = new MemberService();
  let role;
  service.memberModel = { create: async (input) => {
    role = input.memberType;
    return { ...input, toJSON() { return {}; } };
  } };
  await service.signup({ memberNick: 'fixture', memberPhone: '998901234567', memberPassword: 'fixture-only', memberType: 'STORE' });
  assert.equal(role, 'USER');
});

test('profile update strips role and points', async () => {
  const service = new MemberService();
  let update;
  service.memberModel = { findByIdAndUpdate: (_filter, input) => {
    update = input;
    return { exec: async () => member };
  } };
  await service.updateMember(member, { memberNick: 'fixture', memberType: 'STORE', memberPoints: 999 });
  assert.equal(Object.hasOwn(update.$set, 'memberType'), false);
  assert.equal(Object.hasOwn(update.$set, 'memberPoints'), false);
  assert.equal(update.$set.memberNick, 'fixture');
});

test('empty checkout is rejected before any database use', async () => {
  await assert.rejects(new OrderService().createOrder(member, [], 'checkout-fixture-key'), error => error.code === 'INVALID_CART');
});

test('order item schema rejects negative prices and quantities', () => {
  assert.ok(new OrderItem({ productId: id, orderId: otherId, itemPrice: -10, itemQuantity: -2 }).validateSync());
});

test('onSale filters by an actual price reduction', async () => {
  const service = new ProductService();
  let pipeline;
  service.productModel = { aggregate: (input) => {
    pipeline = input;
    return { exec: async () => [{ _id: id }] };
  } };
  await service.getProducts({ page: 1, limit: 4, order: 'createdAt', onSale: true });
  assert.ok(pipeline.some((step) => step.$match?.$expr));
});

after(() => assert.equal(mongoose.connection.readyState, 0, 'Tests must never connect to MongoDB'));
