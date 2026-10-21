#!/usr/bin/env node
/**
 * Guarded replacement for `prisma migrate reset`: drops and recreates the
 * disposable test database, applies all migrations, and optionally seeds it.
 *
 *   RESET_DATABASE_URL="postgresql://cbtest:<password>@127.0.0.1:55432/curiousbees?schema=public" \
 *     npm run db:reset          # reset + migrations
 *     npm run db:setup          # reset + migrations + seed
 *
 * Anything other than the dedicated test database is refused before Prisma
 * starts (see reset-guard.js). Development databases are migrated with
 * `npm run db:migrate`; production only ever uses `prisma migrate deploy`.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { assertResetTarget, childEnvironment, TARGET_LABEL } = require('./reset-guard');

const ROOT = path.resolve(__dirname, '../..');
const SCHEMA = 'apps/api/prisma/schema.prisma';

function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: ROOT, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const seed = process.argv.includes('--seed');
  let target;
  try {
    target = assertResetTarget(process.env.RESET_DATABASE_URL);
  } catch (e) {
    console.error(`\n❌ ${e.message}\n`);
    process.exit(1);
  }

  const env = childEnvironment(target);
  console.log(`Resetting the disposable test database ${TARGET_LABEL}...`);
  run(path.join(ROOT, 'node_modules/.bin/prisma'), ['migrate', 'reset', '--force', '--skip-seed', '--schema', SCHEMA], env);

  if (seed) {
    console.log('Seeding the disposable test database...');
    run('npm', ['run', 'prisma:seed', '--workspace=apps/api'], env);
  }
}

main();
