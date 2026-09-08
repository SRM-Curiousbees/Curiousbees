const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🩺 Running CuriousBees V2 Doctor Diagnostics...\n');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Helper for colored logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let hasErrors = false;
let hasWarnings = false;

const reportSuccess = (msg) => console.log(`  ${colors.green}✅ ${msg}${colors.reset}`);
const reportWarning = (msg) => {
  console.log(`  ${colors.yellow}⚠️  ${msg}${colors.reset}`);
  hasWarnings = true;
};
const reportError = (msg) => {
  console.log(`  ${colors.red}❌ ${msg}${colors.reset}`);
  hasErrors = true;
};

// 1. Check Node.js and npm versions
console.log(`${colors.bold}1. Runtime Engine Verification:${colors.reset}`);
const nodeVer = process.version;
if (nodeVer.startsWith('v22') || nodeVer.startsWith('v20') || nodeVer.startsWith('v24')) {
  reportSuccess(`Node.js version matches specifications: ${nodeVer}`);
} else {
  reportWarning(`Recommended Node version is >=v22 (current: ${nodeVer})`);
}

// 2. Check Environment Config File
console.log(`\n${colors.bold}2. Environment Variable Configuration:${colors.reset}`);
if (!fs.existsSync(envPath)) {
  reportError('Root .env file is missing!');
  console.log(`     -> Solution: Run 'cp .env.example .env' and populate configuration values.`);
  process.exit(1);
}
reportSuccess('Root .env file is present.');

// Load env variables
require('dotenv').config({ path: envPath });

// Validate critical env variables
const validateUrl = (key, isOptional = false) => {
  const value = process.env[key];
  if (!value) {
    if (isOptional) {
      reportWarning(`${key} is missing (Optional)`);
      return false;
    } else {
      reportError(`${key} is missing in root .env!`);
      return false;
    }
  }

  try {
    new URL(value);
    reportSuccess(`${key} format is valid.`);
    return true;
  } catch (err) {
    if (isOptional) {
      reportWarning(`${key} value "${value}" is not a valid URL (Optional)`);
    } else {
      reportError(`${key} value "${value}" is not a valid URL!`);
    }
    return false;
  }
};

const hasDb = validateUrl('DATABASE_URL');
const hasDirect = validateUrl('DIRECT_URL');
const hasPublicApi = validateUrl('NEXT_PUBLIC_API_URL');
const hasRedisUrl = validateUrl('REDIS_URL', true);

// Check Auth Mode & Dev Role Settings
const authMode = process.env.AUTH_MODE || 'GOOGLE_ADMIN_MANAGED';
const pubAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE || 'GOOGLE_ADMIN_MANAGED';

console.log(`\n   --- Auth Mode & Configuration Checks ---`);
reportSuccess(`Backend AUTH_MODE is configured as "${authMode}".`);
reportSuccess(`Frontend NEXT_PUBLIC_AUTH_MODE is configured as "${pubAuthMode}".`);

const allowedModes = ['GOOGLE_ADMIN_MANAGED', 'production', 'development'];
if (!allowedModes.includes(authMode) || !allowedModes.includes(pubAuthMode)) {
  reportWarning(`Authentication mode is configured as "${authMode}". Recommended: GOOGLE_ADMIN_MANAGED`);
} else {
  reportSuccess(`Auth Mode settings are standard ("${authMode}").`);
}

if (process.env.DEVELOPMENT_MODE === 'true' || process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true') {
  reportWarning('Development auth bypass is active.');
} else {
  reportSuccess('Standard production/admin-managed authentication flow is active.');
}

console.log(`\n   --- Supabase & Service Credentials ---`);
// Validate Supabase credentials presence
const supabaseKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const missingSupabaseKeys = supabaseKeys.filter(k => !process.env[k]);
if (missingSupabaseKeys.length > 0) {
  reportError(`Missing Supabase credentials: ${missingSupabaseKeys.join(', ')}`);
} else {
  reportSuccess('Supabase Public Client credentials are present.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  reportWarning('SUPABASE_SERVICE_ROLE_KEY is missing (backend admin service actions may be limited).');
} else {
  reportSuccess('Supabase Service Role Key is present.');
}

// Check Brevo Email API
if (!process.env.BREVO_API_KEY) {
  reportWarning('BREVO_API_KEY is missing (transactional emails will be simulated/logged).');
} else {
  reportSuccess('Brevo Email API Key is configured.');
}


// 3. Check Database Connections
console.log(`\n${colors.bold}3. Database Connection Testing:${colors.reset}`);

if (hasDb) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL }
      }
    });

    console.log('   Pinging PostgreSQL Database via Prisma Client...');
    execSync('npx prisma db execute --schema=apps/api/prisma/schema.prisma --stdin', {
      input: 'SELECT 1;',
      stdio: 'ignore',
      cwd: rootDir,
    });
    reportSuccess('PostgreSQL connection ping succeeded! DB is active.');
  } catch (err) {
    reportError(`PostgreSQL connection failed: ${err.message}`);
    const dbUrl = process.env.DATABASE_URL || '';
    const isLocalDb = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    if (isLocalDb) {
      console.log('     -> Solution: Ensure your local PostgreSQL Docker container is running by executing: npm run docker:up');
    } else {
      console.log('     -> Solution: Ensure your internet connection is active, and verify that your cloud database (Supabase) credentials in the root .env are correct.');
    }
  }
} else {
  reportError('PostgreSQL test skipped due to missing DATABASE_URL config.');
}

// 4. Check Shared Package Builds
console.log(`\n${colors.bold}4. Shared Package Build Validation:${colors.reset}`);
const packagesToCheck = [
  { name: '@curiousbees/types', path: 'packages/types/dist/index.js' },
  { name: '@curiousbees/shared-utils', path: 'packages/shared-utils/dist/index.js' },
  { name: '@curiousbees/constants', path: 'packages/constants/dist/index.js' }
];

packagesToCheck.forEach((pkg) => {
  const fullPath = path.join(rootDir, pkg.path);
  if (fs.existsSync(fullPath)) {
    reportSuccess(`${pkg.name} build files are compiled.`);
  } else {
    reportError(`${pkg.name} build files are missing! Run: npm run setup`);
  }
});

// 5. Check Redis Connection (Optional)
console.log(`\n${colors.bold}5. Redis Caching Connection Testing (Optional):${colors.reset}`);
const redisTarget = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

if (redisTarget) {
  try {
    const Redis = require('ioredis');
    const redis = new Redis(redisTarget, {
      maxRetriesPerRequest: 0,
      connectTimeout: 2000
    });
    
    console.log(`   Pinging Redis at ${redisTarget}...`);
    
    // Promise-based timeout handle
    const pingRedis = () => new Promise(async (resolve, reject) => {
      try {
        const res = await redis.ping();
        resolve(res);
      } catch (err) {
        reject(err);
      } finally {
        redis.disconnect();
      }
    });

    pingRedis()
      .then(() => {
        reportSuccess('Redis connection succeeded! Queue provider is active.');
      })
      .catch((err) => {
        reportWarning(`Redis connection failed: ${err.message}`);
        const isLocalRedis = redisTarget.includes('localhost') || redisTarget.includes('127.0.0.1');
        if (isLocalRedis) {
          console.log('     -> Solution: If running locally, ensure your Redis Docker container is active by running: npm run docker:up');
        } else {
          console.log('     -> Solution: Verify that your remote Redis credentials (e.g. Upstash) in the root .env are correct.');
        }
        console.log('     -> Note: The application will run fine in DEVELOPMENT_MODE, but background jobs (queues) will not execute.');
      });
  } catch (err) {
    reportWarning(`Could not verify Redis client: ${err.message}`);
  }
} else {
  reportWarning('Redis environment configuration is completely missing (skipped test).');
}

// Wait for Redis async check to settle briefly before printing summary
setTimeout(() => {
  console.log(`\n==================================================`);
  if (hasErrors) {
    console.log(` ${colors.red}${colors.bold}🩺 DOCTOR DIAGNOSTIC STATUS: FAILED${colors.reset}`);
    console.log(' Critical issues found! Please fix the errors reported above before running dev.');
  } else if (hasWarnings) {
    console.log(` ${colors.yellow}${colors.bold}🩺 DOCTOR DIAGNOSTIC STATUS: WARNING${colors.reset}`);
    console.log(' Connection warnings present, but core systems are standard.');
  } else {
    console.log(` ${colors.green}${colors.bold}🩺 DOCTOR DIAGNOSTIC STATUS: HEALTHY${colors.reset}`);
    console.log(' Your monorepo is fully configured and ready for development.');
  }
  console.log(`==================================================\n`);
  process.exit(hasErrors ? 1 : 0);
}, 2500);
