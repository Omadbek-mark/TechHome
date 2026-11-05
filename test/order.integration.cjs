// This file always starts its OWN ephemeral replica set. Never consumes MONGO_URL/.env.
process.env.NODE_ENV = 'test';
process.env.SECRET_TOKEN = 'stage3-loopback-fixture-key-not-a-deployment-secret';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const OrderService = require('../dist/models/Order.service').default;
const { orderResponse } = require('../dist/models/Order.service');
const Order = require('../dist/schema/Order.model').default;
const Item = require('../dist/schema/OrderItem.model').default;
const Product = require('../dist/schema/Product.model').default;
const Member = require('../dist/schema/Member.model').default;
let repl, buyer, service;

before(async () => {
  repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: path.join(tmpdir(), 'techhome-mongodb-binaries') },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  const uri = repl.getUri('techhome_stage3_tests');
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([Order.init(), Item.init(), Product.init(), Member.init()]);
}, { timeout: 240000 });

after(async () => { await mongoose.disconnect(); if (repl) await repl.stop(); });
beforeEach(async () => {
  assert.equal(mongoose.connection.name, 'techhome_stage3_tests');
  await Promise.all([Order.deleteMany({}), Item.deleteMany({}), Product.deleteMany({}), Member.deleteMany({})]);
  buyer = await Member.create({ memberNick: 'fixture-buyer', memberPhone: '998900000000', memberPassword: 'fixture-hash' });
  service = new OrderService();
});
async function product(extra = {}) {
  return Product.create({ productName: 'Fixture ' + randomUUID(), productCategory: 'KITCHEN', productStatus: 'PROCESS',
    productPrice: 33.33, productLeftCount: 10, installmentMonths: 6, installmentMonthly: 999, productImages: ['uploads/products/fixture.png'], ...extra });
}
function cart(p, quantity = 1, extra = {}) { return [{ productId: String(p._id), itemQuantity: quantity, ...extra }]; }
const change = (order, status, member = buyer) => service.updateOrder(member, { orderId: String(order._id), orderStatus: status });

test('checkout ignores spoofed client price, records exact cents/installments and immutable item snapshots', async () => {
  const p = await product({ productPrice: 11.01 });
  const order = await service.createOrder(buyer, cart(p, 3, { itemPrice: 0.01, orderId: 'injected' }), randomUUID());
  assert.equal(order.orderTotalCents, 3803); assert.equal(order.orderTotal, 38.03); assert.equal(order.orderDelivery, 5);
  assert.equal((await Product.findById(p._id)).productLeftCount, 7);
  const item = await Item.findOne({ orderId: order._id });
  assert.equal(item.itemPriceCents, 1101); assert.equal(item.itemPrice, 11.01);
  assert.equal(item.installmentMonthly, 1.83); assert.equal(item.installmentLastMonth, 1.86);
  const name = item.productName;
  await Product.updateOne({ _id: p._id }, { $set: { productName: 'Changed name', productPrice: 400 } });
  const [listed] = await service.getMyOrders(buyer, { page: 1, limit: 5, orderStatus: 'PAUSE' });
  assert.equal(listed.orderItems[0].productName, name); assert.equal(listed.orderItems[0].itemPrice, 11.01);
  assert.equal(orderResponse(listed).idempotencyKey, undefined); assert.equal(orderResponse(listed).checkoutHash, undefined);
  assert.equal(orderResponse(listed).readOnly, false);
});

test('delivery threshold uses integer cents, with no floating point drift', async () => {
  const p = await product();
  const below = await service.createOrder(buyer, cart(p, 3), randomUUID());
  assert.equal(below.orderSubtotalCents, 9999); assert.equal(below.orderTotal, 104.99);
  const exact = await product({ productPrice: 100 });
  const free = await service.createOrder(buyer, cart(exact), randomUUID());
  assert.equal(free.orderDelivery, 0); assert.equal(free.orderTotalCents, 10000);
});

test('same intent key replay is scoped to buyer, cart-canonical, and cannot be reused for a different cart', async () => {
  const p = await product(); const key = randomUUID();
  const first = await service.createOrder(buyer, cart(p, 2), key);
  const again = await service.createOrder(buyer, [...cart(p), ...cart(p)], key);
  assert.equal(String(first._id), String(again._id));
  assert.equal(await Order.countDocuments(), 1); assert.equal(await Item.countDocuments(), 1);
  assert.equal((await Product.findById(p._id)).productLeftCount, 8);
  await assert.rejects(service.createOrder(buyer, cart(p, 3), key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  const other = await Member.create({ memberNick: 'other-buyer', memberPhone: '998900000001', memberPassword: 'fixture-hash' });
  const own = await service.createOrder(other, cart(p), key);
  assert.notEqual(String(own._id), String(first._id));
  await assert.rejects(change(first, 'DELETE', other), error => error.status === 404);
});

test('parallel identical requests create only one order and one stock deduction', async () => {
  const p = await product({ productLeftCount: 1 }); const key = randomUUID();
  const orders = await Promise.all(Array.from({ length: 5 }, () => service.createOrder(buyer, cart(p), key)));
  assert.equal(new Set(orders.map(o => String(o._id))).size, 1);
  assert.equal(await Order.countDocuments(), 1); assert.equal(await Item.countDocuments(), 1);
  assert.equal((await Product.findById(p._id)).productLeftCount, 0);
});

test('competing intents cannot oversell the last item', async () => {
  const p = await product({ productLeftCount: 1 });
  const outcomes = await Promise.allSettled([service.createOrder(buyer, cart(p), randomUUID()), service.createOrder(buyer, cart(p), randomUUID())]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(o => o.status === 'rejected').reason.code, 'OUT_OF_STOCK');
  assert.equal((await Product.findById(p._id)).productLeftCount, 0);
  assert.equal(await Order.countDocuments(), 1);
});

test('failed item persistence rolls back order, items and stock; same key may then succeed', async (t) => {
  const p = await product(); const key = randomUUID();
  const original = Item.insertMany;
  const mocked = t.mock.method(Item, 'insertMany', async function (...args) {
    await original.apply(this, args);
    throw new Error('Synthetic failure after item writes');
  });
  await assert.rejects(service.createOrder(buyer, cart(p, 2), key));
  assert.equal(await Order.countDocuments(), 0); assert.equal(await Item.countDocuments(), 0);
  assert.equal((await Product.findById(p._id)).productLeftCount, 10);
  mocked.mock.restore();
  await service.createOrder(buyer, cart(p, 2), key);
  assert.equal(await Order.countDocuments(), 1);
});

test('unavailable products abort the whole cart and cannot leave partial reservations', async () => {
  const p = await product(); const paused = await product({ productStatus: 'PAUSE' });
  await assert.rejects(service.createOrder(buyer, [...cart(p), ...cart(paused)], randomUUID()), error => error.code === 'OUT_OF_STOCK');
  assert.equal((await Product.findById(p._id)).productLeftCount, 10); assert.equal(await Order.countDocuments(), 0);
});

test('repeat cancellation restores stock once; deleted product makes cancellation roll back safely', async () => {
  const p = await product(); const order = await service.createOrder(buyer, cart(p, 2), randomUUID());
  await Promise.all(Array.from({ length: 4 }, () => change(order, 'DELETE')));
  assert.equal((await Product.findById(p._id)).productLeftCount, 10);
  assert.equal((await Member.findById(buyer._id)).memberPoints, 0);
  await assert.rejects(change(order, 'PROCESS'), error => error.code === 'INVALID_TRANSITION');
  const next = await service.createOrder(buyer, cart(p), randomUUID());
  await Product.deleteOne({ _id: p._id });
  await assert.rejects(change(next, 'DELETE'), error => error.code === 'INVENTORY_CONFLICT');
  assert.equal((await Order.findById(next._id)).orderStatus, 'PAUSE');
});

test('demo confirmation awards one point, rejects skipping/backwards transitions and never restores confirmed stock', async () => {
  const p = await product(); const order = await service.createOrder(buyer, cart(p), randomUUID());
  await assert.rejects(change(order, 'FINISH'), error => error.code === 'INVALID_TRANSITION');
  await Promise.all(Array.from({ length: 4 }, () => change(order, 'PROCESS')));
  assert.equal((await Member.findById(buyer._id)).memberPoints, 1);
  await assert.rejects(change(order, 'DELETE'), error => error.code === 'INVALID_TRANSITION');
  await Promise.all([change(order, 'FINISH'), change(order, 'FINISH')]);
  assert.equal((await Member.findById(buyer._id)).memberPoints, 1);
  assert.equal((await Product.findById(p._id)).productLeftCount, 9);
});

test('concurrent confirm/cancel has only one valid outcome and matching stock/points', async () => {
  const p = await product(); const order = await service.createOrder(buyer, cart(p), randomUUID());
  const results = await Promise.allSettled([change(order, 'PROCESS'), change(order, 'DELETE')]);
  assert.equal(results.filter(o => o.status === 'fulfilled').length, 1);
  const saved = await Order.findById(order._id);
  const stock = (await Product.findById(p._id)).productLeftCount;
  const points = (await Member.findById(buyer._id)).memberPoints;
  if (saved.orderStatus === 'PROCESS') { assert.equal(stock, 9); assert.equal(points, 1); }
  else { assert.equal(saved.orderStatus, 'DELETE'); assert.equal(stock, 10); assert.equal(points, 0); }
});

test('historical orders stay read-only and are not recomputed or restocked', async () => {
  const p = await product();
  const legacy = await Order.create({ memberId: buyer._id, orderTotal: 123.45, orderDelivery: 5, orderStatus: 'PAUSE' });
  assert.equal(orderResponse(legacy).readOnly, true);
  await assert.rejects(change(legacy, 'DELETE'), error => error.code === 'HISTORICAL_ORDER_READ_ONLY');
  assert.equal((await Order.findById(legacy._id)).orderTotal, 123.45);
  assert.equal((await Product.findById(p._id)).productLeftCount, 10);
});

test('concurrent reuse of one key for different carts cannot create two orders', async () => {
  const first = await product(), second = await product(); const key = randomUUID();
  const outcomes = await Promise.allSettled([service.createOrder(buyer, cart(first), key), service.createOrder(buyer, cart(second), key)]);
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(outcome => outcome.status === 'rejected').reason.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(await Order.countDocuments(), 1);
  assert.equal((await Product.findById(first._id)).productLeftCount + (await Product.findById(second._id)).productLeftCount, 19);
});

test('checkout validates key and quantities without any writes, including invalid persisted prices', async () => {
  const p = await product();
  for (const quantity of [0, -1, 1.5, 100, '1']) {
    await assert.rejects(service.createOrder(buyer, cart(p, quantity), randomUUID()), error => error.code === 'INVALID_CART');
  }
  await assert.rejects(service.createOrder(buyer, cart(p)), error => error.code === 'IDEMPOTENCY_KEY_REQUIRED');
  await Product.collection.updateOne({ _id: p._id }, { $set: { productPrice: 0.001 } });
  await assert.rejects(service.createOrder(buyer, cart(p), randomUUID()), error => error.code === 'CATALOG_PRICE_INVALID');
  assert.equal((await Product.findById(p._id)).productLeftCount, 10);
  assert.equal(await Order.countDocuments(), 0);
});

test('HTTP checkout/status contract uses CSRF, idempotency and safe server totals on a real test replica set', async (t) => {
  const http = require('supertest');
  const session = require('express-session');
  const bcrypt = require('bcryptjs');
  const createApp = require('../dist/app').default;
  await Member.updateOne({ _id: buyer._id }, { $set: { memberPassword: await bcrypt.hash('fixture-password', 4) } });
  const p = await product({ productPrice: 42.25 });
  const origin = 'http://127.0.0.1:3000';
  const app = createApp({ config: { production: false, origins: [origin], sessionSecret: 'stage3-test-session-key-never-use-in-deployment', trustProxyHops: 0, uploadsRoot: tmpdir() }, store: new session.MemoryStore() });
  const server = app.listen(0, '127.0.0.1');
  await require('node:events').once(server, 'listening');
  t.after(() => new Promise(done => server.close(done)));
  const agent = http.agent(server);
  const initialCsrf = (await agent.get('/member/csrf')).body.csrfToken;
  const login = await agent.post('/member/login').set('Origin', origin).set('X-CSRF-Token', initialCsrf)
    .send({ memberNick: buyer.memberNick, memberPassword: 'fixture-password' }).expect(200);
  const csrf = login.body.csrfToken;
  const send = () => agent.post('/order/create').set('Origin', origin).set('X-CSRF-Token', csrf);
  await send().send(cart(p)).expect(400);
  const key = randomUUID();
  const response = await send().set('Idempotency-Key', key).send(cart(p, 2, { itemPrice: 0.01 })).expect(201);
  assert.equal(response.body.orderTotal, 89.5); assert.equal(response.body.paymentMode, 'DEMO');
  for (const field of ['idempotencyKey','checkoutHash','workflowVersion','stockReserved']) assert.equal(response.body[field], undefined);
  const retry = await send().set('Idempotency-Key', key).send(cart(p, 2)).expect(201);
  assert.equal(retry.body._id, response.body._id);
  const listed = await agent.get('/order/all?orderStatus=PAUSE&page=1&limit=5').expect(200);
  assert.equal(listed.body[0].orderItems[0].itemPrice, 42.25);
  await agent.post('/order/update').set('Origin', origin).set('X-CSRF-Token', csrf)
    .send({ orderId: response.body._id, orderStatus: 'PROCESS' }).expect(200);
  const profile = await agent.get('/member/detail').expect(200);
  assert.equal(profile.body.memberPoints, 1);
});

test('missing unique checkout index disables writes instead of allowing unsafe idempotency', async () => {
  const p = await product();
  await Order.collection.dropIndex('memberId_1_idempotencyKey_1');
  try {
    await assert.rejects(service.createOrder(buyer, cart(p), randomUUID()), error => error.code === 'CHECKOUT_UNAVAILABLE');
    assert.equal((await Product.findById(p._id)).productLeftCount, 10);
    assert.equal(await Order.countDocuments(), 0);
  } finally {
    await Order.collection.createIndex({ memberId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
  }
});
