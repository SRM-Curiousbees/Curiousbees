// Read-only checks against the real disposable test database (they only run
// SELECTs). Skipped, and reported as skipped, unless DISPOSABLE_TEST_DATABASE_URL
// points at it (CI sets it; locally: scripts/db/local-test-db.sh).
const test = require('node:test');
const assert = require('node:assert/strict');
const { databaseIdentity, assertDisposableIdentity, verifyDisposableDatabase } = require('../reset-guard');

const URL_ = process.env.DISPOSABLE_TEST_DATABASE_URL;
const needsDb = URL_ ? {} : { skip: 'DISPOSABLE_TEST_DATABASE_URL is not set' };
const refused = { code: 'RESET_TARGET_REFUSED' };

test('the marked disposable test database is positively identified', needsDb, () => {
  assert.deepEqual(databaseIdentity(URL_), { database: 'curiousbees', user: 'cbtest', marker: 'on' });
  assert.equal(verifyDisposableDatabase(URL_, {}), new URL(URL_).toString());
});

test('another database on the same server is refused by its name, marker or not', needsDb, () => {
  // The marker may be server-wide (docker-compose.test.yml, local-test-db.sh), so the name matters too.
  const other = new URL(URL_);
  other.pathname = '/postgres';
  const identity = databaseIdentity(other.toString());
  assert.equal(identity.database, 'postgres');
  assert.throws(() => assertDisposableIdentity(identity), refused);
});

test('wrong credentials mean the database cannot be identified, so it is refused', needsDb, () => {
  const wrong = new URL(URL_);
  wrong.password = 'not-the-password';
  assert.throws(() => databaseIdentity(wrong.toString()), refused);
});

test('an unreachable database cannot be identified, so it is refused', () => {
  assert.throws(() => databaseIdentity('postgresql://cbtest:x@127.0.0.1:1/curiousbees'), refused);
});
