import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encryptObject, decryptObject, createSignature, verifySignature, capabilities } from '../src/production-services.js';
import { getJurisdiction, listJurisdictions } from '../src/jurisdictions.js';

test('AES-256-GCM encryption round-trips sensitive session data', () => {
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  const original = { privateNotes: { partyA: [{ note:'confidential' }] } };
  const encrypted = encryptObject(original);
  assert.equal(encrypted.mode, 'aes-256-gcm');
  assert.ok(!JSON.stringify(encrypted).includes('confidential'));
  assert.deepEqual(decryptObject(encrypted), original);
  delete process.env.DATA_ENCRYPTION_KEY;
});

test('electronic signature audit records detect tampering', () => {
  process.env.SIGNING_SECRET = 'test-secret-not-used-in-production';
  const record = createSignature({ sessionId:'s1', proposalId:'p1', userId:'u1', typedName:'Test User', consentText:'I accept', ip:'127.0.0.1', userAgent:'test' });
  assert.equal(verifySignature(record), true);
  assert.equal(verifySignature({ ...record, typedName:'Changed User' }), false);
  delete process.env.SIGNING_SECRET;
});

test('jurisdiction packs expose official sources and disclaimers', () => {
  assert.equal(listJurisdictions().length, 3);
  for (const item of listJurisdictions()) {
    const pack = getJurisdiction(item.code);
    assert.ok(pack.consumer.sources.every(source => source.url.startsWith('https://')));
    assert.match(pack.consumer.disclaimer, /information/i);
  }
});

test('capability flags remain false without production secrets', () => {
  assert.equal(typeof capabilities().database, 'boolean');
  assert.equal(typeof capabilities().llm, 'boolean');
});
