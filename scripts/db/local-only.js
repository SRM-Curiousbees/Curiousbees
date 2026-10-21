#!/usr/bin/env node
/**
 * Runs a data-writing developer command only against a database on this
 * machine (see assertLocalDatabase in reset-guard.js), e.g.
 *
 *   node scripts/db/local-only.js prisma migrate dev
 *
 * The URL is DATABASE_URL from the environment, else from the root .env (the
 * same place the Prisma CLI would find it). The command then runs with exactly
 * that URL pinned in its environment, so a different .env can't redirect it.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { assertLocalDatabase } = require('./reset-guard');

const ROOT = path.resolve(__dirname, '../..');

function resolveDatabaseUrl(env = process.env, rootDir = ROOT) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const file = path.join(rootDir, '.env');
  if (!fs.existsSync(file)) return undefined;
  return require('dotenv').parse(fs.readFileSync(file)).DATABASE_URL;
}

function resolveDirectUrl(env = process.env, rootDir = ROOT) {
  if (env.DIRECT_URL) return env.DIRECT_URL;
  const file = path.join(rootDir, '.env');
  if (!fs.existsSync(file)) return undefined;
  return require('dotenv').parse(fs.readFileSync(file)).DIRECT_URL;
}

function main() {
  const command = process.argv.slice(2);
  if (command.length === 0) {
    console.error('Usage: node scripts/db/local-only.js <command> [args...]');
    process.exit(2);
  }
  let url;
  try {
    url = assertLocalDatabase(resolveDatabaseUrl(), `run "${command.join(' ')}"`);
  } catch (e) {
    console.error(`\n❌ ${e.message}\n`);
    process.exit(1);
  }
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('PG')) env[key] = value;
  }
  env.DATABASE_URL = url;
  const rawDirect = resolveDirectUrl();
  if (rawDirect) {
    try {
      env.DIRECT_URL = assertLocalDatabase(rawDirect, `verify directUrl for "${command.join(' ')}"`);
    } catch {
      env.DIRECT_URL = rawDirect;
    }
  } else {
    env.DIRECT_URL = url;
  }
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', env });
  if (result.error) {
    console.error(`\n❌ Could not run ${command[0]}: ${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

if (require.main === module) main();

module.exports = { resolveDatabaseUrl, resolveDirectUrl };
