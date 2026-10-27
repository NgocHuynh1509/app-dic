const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const key = 'PDIC-1234-5678-ABCD-EF01';
const keyHash = crypto.createHash('sha256').update('PDIC12345678ABCDEF01').digest('hex');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dic-unlock-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Exercise real encrypted persistence; Electron supplies DPAPI in production.
  const secret = crypto.randomBytes(32);
  const storage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
      const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), body]);
    },
    decryptString: (value) => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', secret, value.subarray(0, 12));
      decipher.setAuthTag(value.subarray(12, 28));
      return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString('utf8');
    },
  };
  const { createDicFeatureLicense } = require('../electron/dic-feature-license.cjs');
  const file = path.join(dir, 'particle-dic.bin');
  const create = (overrides = {}) => createDicFeatureLicense({ file, keyHash, storage, ...overrides });
  return { file, create, storage };
}

test('starts locked and rejects invalid or empty keys without saving', (t) => {
  const { file, create } = fixture(t);
  const license = create();
  assert.equal(license.status().unlocked, false);
  for (const invalid of ['', 'WRONG-KEY', null, {}, key + '!']) {
    assert.equal(license.activate(invalid).ok, false);
  }
  assert.equal(fs.existsSync(file), false);
});

test('valid key unlocks and remains unlocked in a new instance', (t) => {
  const { file, create } = fixture(t);
  assert.equal(create().activate('  pdic-1234-5678-abcd-ef01  ').ok, true);
  assert.equal(create().status().unlocked, true);
  assert.equal(fs.readFileSync(file).includes(Buffer.from(key)), false);
});

test('corrupt or another machines encrypted activation remains locked', (t) => {
  const { file, create, storage } = fixture(t);
  create().activate(key);
  const otherStorage = { ...storage, decryptString: () => { throw new Error('wrong machine'); } };
  assert.equal(create({ storage: otherStorage }).status().unlocked, false);
  fs.writeFileSync(file, 'corrupt');
  assert.equal(create().status().unlocked, false);
});

test('encryption or save failures never report successful activation', (t) => {
  const { file, create, storage } = fixture(t);
  assert.equal(create({ storage: { ...storage, isEncryptionAvailable: () => false } }).activate(key).ok, false);
  fs.mkdirSync(file);
  const license = create();
  assert.equal(license.activate(key).ok, false);
  assert.equal(license.status().unlocked, false);
});

test('a decrypted record with the wrong key remains locked', (t) => {
  const { file, create, storage } = fixture(t);
  fs.writeFileSync(file, storage.encryptString('WRONG'));
  assert.equal(create().status().unlocked, false);
});

test('feature lock rejects DIC HTTP and WebSocket even with a valid app token', async (t) => {
  const names = ['DIC_AUTH_DISABLED', 'DIC_LOCAL_TOKEN', 'DIC_FEATURE_UNLOCKED'];
  const previous = names.map((name) => process.env[name]);
  t.after(() => names.forEach((name, i) => {
    if (previous[i] === undefined) delete process.env[name];
    else process.env[name] = previous[i];
  }));
  delete process.env.DIC_AUTH_DISABLED;
  process.env.DIC_LOCAL_TOKEN = 'app-token';
  process.env.DIC_FEATURE_UNLOCKED = '0';
  const auth = await import('../server/local-auth.js');
  assert.equal(auth.isAuthorized('app-token'), false);
  assert.equal(auth.verifyWsClient({ url: '/ws?token=app-token' }), false);
  assert.equal(auth.isLocked(), true);
  process.env.DIC_AUTH_DISABLED = '1';
  assert.equal(auth.isAuthorized('app-token'), false);
  delete process.env.DIC_AUTH_DISABLED;
  process.env.DIC_FEATURE_UNLOCKED = '1';
  assert.equal(auth.isAuthorized('app-token'), true);
  assert.equal(auth.isAuthorized('wrong-token'), false);
  process.env.DIC_LOCAL_TOKEN = '';
  assert.equal(auth.isAuthorized('app-token'), false);
});
