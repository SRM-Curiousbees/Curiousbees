// Kept for old instructions that call `node scripts/db-setup.js`. It used to run
// `prisma db push --accept-data-loss` against whatever database .env pointed
// at; it now delegates to the guarded reset, which only accepts the disposable
// test database passed in RESET_DATABASE_URL. See scripts/db/guarded-reset.js.
process.argv.push('--seed');
require('./db/guarded-reset');
