// Own loopback replica set only. Never load dotenv or consume deployment DB settings.
process.env.NODE_ENV = 'test';
process.env.SECRET_TOKEN = 'catalog-test-only-token-key-never-for-deployment';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { tmpdir } = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const Product = require('../dist/schema/Product.model').default;
const Member = require('../dist/schema/Member.model').default;
const ProductService = require('../dist/models/Product.service').default;
const { catalogInquiry, productFields } = require('../dist/libs/catalog/product');
const service = new ProductService();
let repl;
before(async () => {
  repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: path.join(tmpdir(), 'techhome-mongodb-binaries') }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  const uri = repl.getUri('techhome_catalog_tests'); assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
  await mongoose.connect(uri); await Promise.all([Product.init(), Member.init()]);
}, { timeout: 240000 });
after(async () => { await mongoose.disconnect(); if (repl) await repl.stop(); });
beforeEach(async () => { assert.equal(mongoose.connection.name, 'techhome_catalog_tests'); await Promise.all([Product.deleteMany({}), Member.deleteMany({})]); });
const product = (extra = {}) => service.createNewProduct({ productName: 'Fixture', productCategory: 'KITCHEN', productStatus: 'PROCESS', productPrice: 42.25, productLeftCount: 3, productImages: [], ...extra });

test('deals matches real numeric reductions together with category, search, total and pagination', async () => {
  await product({ productName: 'Kitchen deal', productOldPrice: 60 });
  await product({ productName: 'Kitchen regular' });
  await product({ productName: 'Laundry deal', productCategory: 'LAUNDRY', productOldPrice: 70 });
  await product({ productName: 'Hidden deal', productOldPrice: 70, productStatus: 'PAUSE' });
  const rows = await Product.collection.insertMany([
    { productName: 'Bad old equal', productStatus: 'PROCESS', productCategory: 'KITCHEN', productPrice: 10, productOldPrice: 10 },
    { productName: 'Bad old string', productStatus: 'PROCESS', productCategory: 'KITCHEN', productPrice: 10, productOldPrice: '30' },
    { productName: 'Bad old infinite', productStatus: 'PROCESS', productCategory: 'KITCHEN', productPrice: 10, productOldPrice: Infinity },
    { productName: 'Bad old null', productStatus: 'PROCESS', productCategory: 'KITCHEN', productPrice: 10, productOldPrice: null },
  ]);
  const result = await service.getCatalog({ onSale: 'true', productCategory: 'KITCHEN', search: 'Kitchen', page: '1', limit: '1' });
  assert.equal(result.total, 1); assert.equal(result.items[0].productName, 'Kitchen deal');
  assert.equal((await service.getCatalog({ onSale: true })).total, 2);
  assert.equal((await service.getProducts({ onSale: true, page: 1, limit: 50, order: 'createdAt' })).length, 2);
  const all = await service.getCatalog({}); assert.equal(all.total, 7);
  assert.equal(all.items.find(p => String(p._id) === String(rows.insertedIds[0])).productOldPrice, undefined);
});
test('page totals remain accurate for empty and out-of-range pages; sort ties are stable', async () => {
  for (let i = 0; i < 5; i++) await product({ productName: 'Item ' + i, productPrice: i < 2 ? 10 : 20 + i });
  const first = await service.getCatalog({ order: 'productPrice', limit: 2, page: 1 });
  const second = await service.getCatalog({ order: 'productPrice', limit: 2, page: 2 });
  assert.equal(first.total, 5); assert.equal(first.items.length, 2); assert.equal(second.items.length, 2);
  assert.equal(new Set([...first.items, ...second.items].map(p => String(p._id))).size, 4);
  assert.deepEqual(await service.getCatalog({ page: 99, limit: 2 }), { items: [], total: 5, page: 99, limit: 2 });
  assert.equal((await service.getCatalog({ search: 'absent' })).total, 0);
  assert.equal((await service.getCatalog({ order: 'priceDesc' })).items[0].productPrice, 24);
});
test('search treats regex punctuation literally and filters validated brands/models', async () => {
  await product({ productName: 'Kettle (Pro)', brand: 'Test & Co', model: 'X+1' });
  await product({ productName: 'Ordinary' });
  assert.equal((await service.getCatalog({ search: '(' })).total, 1);
  assert.equal((await service.getCatalog({ search: '.*' })).total, 0);
  assert.equal((await service.getCatalog({ search: 'X+1', brand: 'test & co' })).total, 1);
});
test('rejects malformed filters and Mongo/operator-shaped admin input before writes', async () => {
  for (const input of [{ page: 0 }, { page: '1.5' }, { limit: 51 }, { page: ['1','2'] }, { order: '$where' }, { productCategory: {} }, { onSale: 'yes' }, { search: { $ne: '' } }, { brand: 'x'.repeat(81) }]) {
    assert.throws(() => catalogInquiry(input), e => e.code === 'INVALID_CATALOG_FILTER');
  }
  const current = await product();
  for (const input of [{ $set: { productPrice: 1 } }, { productPrice: -1 }, { productPrice: '1e2' }, { productLeftCount: 1.5 }, { installmentMonths: 18 }, { productOldPrice: 20 }, { capacityLiters: -1 }, { loadKg: 5 }]) {
    await assert.rejects(service.updateChosenProduct(String(current._id), input), e => ['INVALID_PRODUCT','INVALID_DISCOUNT','INVALID_PRODUCT_SPEC'].includes(e.code));
  }
  assert.equal((await Product.findById(current._id)).productPrice, 42.25);
});
test('optional units persist only explicit values, category changes clear incompatible specs', async () => {
  const p = await product({ brand: 'Fixture brand', model: 'Model 1', capacityLiters: 250, widthCm: 60, noiseDb: 40, energyKwhPerYear: 180 });
  assert.equal(p.capacityLiters, 250); assert.equal(p.loadKg, undefined);
  const changed = await service.updateChosenProduct(String(p._id), { productCategory: 'LAUNDRY', loadKg: '8', capacityLiters: '' });
  assert.equal(changed.loadKg, 8); assert.equal(changed.capacityLiters, undefined); assert.equal(changed.widthCm, 60);
  const cleared = await service.updateChosenProduct(String(p._id), { model: '', loadKg: null });
  assert.equal(cleared.model, undefined); assert.equal(cleared.loadKg, undefined);
  assert.equal(cleared.coolingCapacityBtu, undefined);
});
test('price/month edits recalculate exact installment remainder and ignore client monthly amounts', async () => {
  const p = await product({ productPrice: 11.01, installmentMonths: 6, installmentMonthly: 999 });
  assert.equal(p.installmentMonthly, 1.83); assert.equal(p.installmentLastMonth, 1.86);
  const changed = await service.updateChosenProduct(String(p._id), { productPrice: 24.01, installmentMonths: 12, installmentMonthly: 0.01 });
  assert.equal(changed.installmentMonthly, 2); assert.equal(changed.installmentLastMonth, 2.01);
  const cash = await service.updateChosenProduct(String(p._id), { installmentMonths: 0 });
  assert.equal(cash.installmentMonthly, undefined); assert.equal((await Product.findById(p._id)).installmentMonthly, undefined);
  // Historic stale monthly fields are corrected in API projections without migrating stored records.
  await Product.updateOne({ _id: p._id }, { installmentMonths: 6, installmentMonthly: 999 });
  assert.equal((await service.getProduct(null, String(p._id))).installmentMonthly, 4);
});
test('concurrent price/month updates preserve both edits and consistent monthly values', async () => {
  const p = await product({ installmentMonths: 6 });
  await Promise.all([service.updateChosenProduct(String(p._id), { productPrice: 120 }), service.updateChosenProduct(String(p._id), { installmentMonths: 12 })]);
  const saved = await Product.findById(p._id); assert.equal(saved.productPrice, 120); assert.equal(saved.installmentMonths, 12); assert.equal(saved.installmentMonthly, 10);
});
test('public HTTP contract preserves legacy array, validates IDs/query shapes; admin edit/render uses the new fields', async (t) => {
  const createApp = require('../dist/app').default;
  const session = require('express-session'), http = require('supertest'), bcrypt = require('bcryptjs');
  const origin = 'http://127.0.0.1:3000';
  const app = createApp({ config: { production: false, origins: [origin], sessionSecret: 'catalog-test-session-key-only-never-deploy', trustProxyHops: 0, uploadsRoot: tmpdir() }, store: new session.MemoryStore() });
  app.set('views', path.resolve(__dirname, '../src/views'));
  const server = app.listen(0, '127.0.0.1'); await require('node:events').once(server, 'listening');
  t.after(() => new Promise(done => server.close(done)));
  const agent = http.agent(server), p = await product({ productOldPrice: 60, productName: '<Fixture>', brand: '<Fixture>' });
  const page = await agent.get('/product/catalog?onSale=true&limit=1').expect(200);
  assert.equal(page.body.total, 1); assert.equal(page.body.items[0].productOldPrice, 60);
  assert.ok(Array.isArray((await agent.get('/product/all')).body));
  await agent.get('/product/catalog?page=1&page=2').expect(400);
  await agent.get('/product/invalid-id').expect(400);
  await agent.get('/product/' + new mongoose.Types.ObjectId()).expect(404);
  await Member.create({ memberNick: 'catalog-store', memberPhone: '998900000004', memberPassword: await bcrypt.hash('fixture-password', 4), memberType: 'STORE' });
  const csrf = (await agent.get('/member/csrf')).body.csrfToken;
  await agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ memberNick: 'catalog-store', memberPassword: 'fixture-password' }).expect(302);
  const html = await agent.get('/admin/product/all').expect(200);
  assert.match(html.text, /name="productName"/); assert.match(html.text, /&lt;Fixture&gt;/); assert.doesNotMatch(html.text, /class="product-edit-form"/);
  assert.match(html.text, /id="price-deal-dialog"/); assert.match(html.text, /for="deal-current-price"/); assert.match(html.text, /for="deal-old-price"/);
  assert.match(html.text, /data-old-price="60"/); assert.match(html.text, /aria-label="Edit price \/ deal for &lt;Fixture&gt;"/);
  const nextCsrf = (await agent.get('/member/csrf')).body.csrfToken;
  const changed = await agent.post('/admin/product/' + p._id).set('Origin', origin).set('X-CSRF-Token', nextCsrf).send({ productPrice: 30, installmentMonths: 6, capacityLiters: 100 }).expect(200);
  assert.equal(changed.body.data.installmentMonthly, 5); assert.equal(changed.body.data.capacityLiters, 100);
  const image = await require('sharp')({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toBuffer();
  // Explicit temporary upload directory is removed after this fixture test.
  const fs = require('node:fs/promises');
  const uploadRoot = await fs.mkdtemp(path.join(tmpdir(), 'techhome-catalog-upload-'));
  app.locals.security.uploadsRoot = uploadRoot;
  t.after(() => fs.rm(uploadRoot, { recursive: true, force: true }));
  await agent.post('/admin/product/create').set('Origin', origin).set('X-CSRF-Token', nextCsrf)
    .field('productName', 'Multipart fixture').field('productCategory', 'LAUNDRY').field('productPrice', '120.01')
    .field('productLeftCount', '2').field('brand', 'Fixture').field('loadKg', '8').field('installmentMonths', '12')
    .field('energyClass', '').field('widthCm', '').attach('productImages', image, { filename: 'fixture.png', contentType: 'image/png' }).expect(201);
  const created = await Product.findOne({ productName: 'Multipart fixture' });
  assert.equal(created.loadKg, 8); assert.equal(created.energyClass, undefined); assert.equal(created.installmentMonthly, 10);

});

test('admin price/deal changes validate both prices, recalculate installments, and remove deals without changing stock', async t => {
  const createApp = require('../dist/app').default, session = require('express-session'), http = require('supertest'), bcrypt = require('bcryptjs');
  const origin = 'http://127.0.0.1:3000';
  const app = createApp({ config: { production: false, origins: [origin], sessionSecret: 'catalog-pricing-test-session-key-never-deploy', trustProxyHops: 0, uploadsRoot: tmpdir() }, store: new session.MemoryStore() });
  const server = app.listen(0, '127.0.0.1'); await require('node:events').once(server, 'listening'); t.after(() => new Promise(done => server.close(done)));
  const agent = http.agent(server), p = await product({ productName: 'Price edit fixture', productPrice: 400, installmentMonths: 6 });
  await Member.create({ memberNick: 'pricing-store', memberPhone: '998900000019', memberPassword: await bcrypt.hash('fixture-password', 4), memberType: 'STORE' });
  let csrf = (await agent.get('/member/csrf')).body.csrfToken;
  await agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ memberNick: 'pricing-store', memberPassword: 'fixture-password' }).expect(302);
  csrf = (await agent.get('/member/csrf')).body.csrfToken;
  const update = body => agent.post('/admin/product/' + p._id).set('Origin', origin).set('X-CSRF-Token', csrf).send(body);
  await agent.post('/admin/product/' + p._id).set('Origin', origin).send({ productPrice: 350, productOldPrice: 400 }).expect(403);
  const changed = await update({ productPrice: '350', productOldPrice: '400' }).expect(200);
  assert.equal(changed.body.data.productPrice,350); assert.equal(changed.body.data.productOldPrice,400);
  assert.equal(changed.body.data.installmentMonthly,58.33); assert.equal(changed.body.data.installmentLastMonth,58.35);
  const deals = await agent.get('/product/catalog?onSale=true').expect(200);
  assert.equal(deals.body.total,1); assert.equal(String(deals.body.items[0]._id),String(p._id));
  for (const invalid of [{productPrice:'350',productOldPrice:'350'},{productPrice:'350',productOldPrice:'300'},{productPrice:'350.001',productOldPrice:'400'},{productPrice:'-1',productOldPrice:'400'}]) await update(invalid).expect(400);
  assert.equal((await Product.findById(p._id)).productPrice,350);
  const removed = await update({ productPrice: '350', productOldPrice: '' }).expect(200);
  assert.equal(removed.body.data.productOldPrice,undefined); assert.equal(removed.body.data.productPrice,350);
  assert.equal((await agent.get('/product/catalog?onSale=true').expect(200)).body.total,0);
  const saved = await Product.findById(p._id).lean(); assert.equal(saved.productOldPrice,undefined); assert.equal(saved.productLeftCount,3); assert.equal(saved.productStatus,'PROCESS');
});

test('admin signup keeps its link and creates at most one STORE across concurrent requests', async t => {
  const createApp = require('../dist/app').default;
  const session = require('express-session');
  const http = require('supertest');
  const origin = 'http://127.0.0.1:3000';
  const app = createApp({
    config: { production: false, origins: [origin], sessionSecret: 'admin-signup-test-session-key-only', trustProxyHops: 0, uploadsRoot: tmpdir() },
    store: new session.MemoryStore(),
  });
  const server = app.listen(0, '127.0.0.1');
  await require('node:events').once(server, 'listening');
  t.after(() => new Promise(done => server.close(done)));

  const previousCode = process.env.ADMIN_SETUP_CODE;
  t.after(() => {
    if (previousCode === undefined) delete process.env.ADMIN_SETUP_CODE;
    else process.env.ADMIN_SETUP_CODE = previousCode;
  });
  delete process.env.ADMIN_SETUP_CODE;

  const agent = http.agent(server);
  const csrf = (await agent.get('/member/csrf')).body.csrfToken;
  const credentials = { memberNick: 'first-admin', memberPhone: '998900000020', memberPassword: 'fixture-password' };
  const submit = (body) => agent.post('/admin/signup').set('Origin', origin).type('form').send({ _csrf: csrf, ...body });
  await agent.get('/admin/login').expect(200).expect(/href="\/admin\/signup"/);
  await agent.get('/admin/signup').expect(200).expect(/setup is unavailable/);
  await submit(credentials).expect(503);

  process.env.ADMIN_SETUP_CODE = 'test-setup-code';
  await agent.get('/admin/signup').expect(200).expect(/name="setupCode"/);
  await agent.post('/admin/signup').set('Origin', origin).send(credentials).expect(403);
  await submit({ ...credentials, setupCode: 'incorrect' }).expect(403);
  assert.equal(await Member.countDocuments({ memberType: 'STORE' }), 0);

  const responses = await Promise.all([
    submit({ ...credentials, setupCode: 'test-setup-code' }),
    submit({ ...credentials, memberNick: 'second-admin', memberPhone: '998900000021', setupCode: 'test-setup-code' }),
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [303, 409]);
  assert.equal(responses.find(response => response.status === 303).headers.location, '/admin/login');
  assert.match(responses.find(response => response.status === 409).text, /An admin account already exists/);
  assert.equal(await Member.countDocuments({ memberType: 'STORE' }), 1);

  await agent.get('/admin/login').expect(200).expect(/href="\/admin\/signup"/);
  await agent.get('/admin/signup').expect(200).expect(/An admin account already exists/);
  await submit({}).expect(409).expect(/An admin account already exists/);
  const admin = await Member.findOne({ memberType: 'STORE' });
  await agent.post('/admin/login').set('Origin', origin).set('X-CSRF-Token', csrf)
    .send({ memberNick: admin.memberNick, memberPassword: credentials.memberPassword }).expect(302);
});
