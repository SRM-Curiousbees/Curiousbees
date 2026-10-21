const test = require('node:test');
const assert = require('node:assert/strict');
const { assertLoadTarget, assertStage, previousStage } = require('../target-guard');

const refused = { code: 'LOAD_TARGET_REFUSED' };

test('loopback targets are allowed by default', () => {
  for (const t of ['http://127.0.0.1:4100', 'http://localhost:4100', 'http://[::1]:4100']) assert.ok(assertLoadTarget(t, {}), t);
});

test('production and third-party hosts are always refused, even if allow-listed', () => {
  const env = { LOAD_TEST_ALLOWED_HOSTS: 'srmcuriousbees.in,www.srmcuriousbees.in,abc.supabase.co,api.brevo.com' };
  for (const t of [
    'https://srmcuriousbees.in', 'https://www.srmcuriousbees.in/api', 'https://origin.srmcuriousbees.in',
    'https://abc.supabase.co', 'https://api.brevo.com', 'https://chat.googleapis.com', 'https://api.zoom.us',
    'https://x.n8n.cloud', 'https://curiousbees.vercel.app', 'https://api.up.railway.app',
  ]) {
    assert.throws(() => assertLoadTarget(t, env), refused, t);
  }
});

test('other hosts need an exact entry in LOAD_TEST_ALLOWED_HOSTS', () => {
  assert.throws(() => assertLoadTarget('https://staging.srmcuriousbees.in', {}), refused);
  assert.throws(() => assertLoadTarget('http://10.0.0.5:4000', {}), refused);
  assert.ok(assertLoadTarget('https://staging.srmcuriousbees.in', { LOAD_TEST_ALLOWED_HOSTS: 'staging.srmcuriousbees.in' }));
  assert.throws(() => assertLoadTarget('https://staging2.srmcuriousbees.in', { LOAD_TEST_ALLOWED_HOSTS: 'staging.srmcuriousbees.in' }), refused);
});

test('malformed targets are refused', () => {
  for (const t of [undefined, '', 'not a url', 'ftp://127.0.0.1', 'http://user:pw@127.0.0.1:4100']) {
    assert.throws(() => assertLoadTarget(t, {}), refused, String(t));
  }
});

test('stages are fixed and ordered', () => {
  assert.equal(assertStage('25'), 25);
  for (const s of ['0', '10', '1000', '7500', 'x', undefined]) assert.throws(() => assertStage(s), refused, String(s));
  assert.equal(previousStage(25), null);
  assert.equal(previousStage(50), 25);
  assert.equal(previousStage(500), 250);
});
