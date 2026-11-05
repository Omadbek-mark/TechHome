const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendError, HttpError } = require('../dist/libs/security/http');
const Errors = require('../dist/libs/Errors').default;
const { Message } = require('../dist/libs/Errors');
function response(error) {
  const result = {};
  const res = { set(name, value) { result[name] = value; return this; }, status(status) { result.status = status; return this; }, json(body) { result.body = body; } };
  sendError(res, error); return result;
}
test('stable error codes distinguish credentials, blocked accounts, conflicts and authentication', () => {
  for (const [error, status, code] of [
    [new Errors(401, Message.WRONG_PASSWORD), 401, 'INVALID_CREDENTIALS'],
    [new Errors(403, Message.BLOCKED_USER), 403, 'ACCOUNT_BLOCKED'],
    [new Errors(401, Message.NOT_AUTHENTICATED), 401, 'UNAUTHENTICATED'],
    [new Errors(304, Message.UPDATE_FAILED), 409, 'UPDATE_FAILED'],
    [new HttpError(409, 'OUT_OF_STOCK', 'Unavailable'), 409, 'OUT_OF_STOCK'],
  ]) { const result = response(error); assert.equal(result.status, status); assert.equal(result.body.code, code); assert.equal(result['Cache-Control'], 'no-store'); }
});
test('unknown, duplicate, parse and validation errors do not leak input or database details', () => {
  const marker = 'synthetic-private-value';
  for (const [error, status, code] of [
    [new Error(marker), 500, 'INTERNAL_ERROR'],
    [Object.assign(new Error(marker), { code: 11000 }), 409, 'DUPLICATE_VALUE'],
    [Object.assign(new Error(marker), { name: 'ValidationError' }), 400, 'VALIDATION_FAILED'],
    [{ type: 'entity.parse.failed', body: marker }, 400, 'INVALID_JSON'],
    [{ type: 'entity.too.large' }, 413, 'PAYLOAD_TOO_LARGE'],
  ]) { const result = response(error); assert.equal(result.status, status); assert.equal(result.body.code, code); assert.ok(!JSON.stringify(result).includes(marker)); }
});
