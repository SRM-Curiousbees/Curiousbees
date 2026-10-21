/**
 * Which hosts a load test may target. Loopback only by default; a staging host
 * must be listed explicitly in LOAD_TEST_ALLOWED_HOSTS (exact hostnames). The
 * production site and third-party services are refused even if listed.
 * scripts/load/curiousbees.k6.js repeats these rules, since k6 can't load this file.
 */
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** Never load-tested: production and the external services the app depends on. */
const ALWAYS_REFUSED_HOSTS = ['srmcuriousbees.in', 'www.srmcuriousbees.in', 'origin.srmcuriousbees.in'];
const ALWAYS_REFUSED_SUFFIXES = [
  '.supabase.co', '.supabase.in', '.supabase.com', 'brevo.com', 'sendinblue.com', 'googleapis.com', 'google.com',
  'zoom.us', 'n8n.cloud', 'vercel.app', 'railway.app',
];

const STAGES = [25, 50, 100, 250, 500];

function refuse(reason) {
  const e = new Error(`Refusing to run the load test: ${reason}.`);
  e.code = 'LOAD_TARGET_REFUSED';
  throw e;
}

function allowedExtraHosts(env) {
  return (env.LOAD_TEST_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/** Returns the parsed target URL, or throws. */
function assertLoadTarget(target, env = process.env) {
  if (!target) refuse('LOAD_TEST_TARGET is not set');
  let url;
  try {
    url = new URL(target);
  } catch {
    refuse('LOAD_TEST_TARGET is not a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') refuse(`protocol "${url.protocol}" is not http(s)`);
  if (url.username || url.password) refuse('the target URL must not contain credentials');
  const host = url.hostname.toLowerCase();
  if (ALWAYS_REFUSED_HOSTS.includes(host) || ALWAYS_REFUSED_SUFFIXES.some((s) => host === s.replace(/^\./, '') || host.endsWith(s.startsWith('.') ? s : `.${s}`))) {
    refuse(`"${host}" is production or a third-party service`);
  }
  if (!LOOPBACK.has(host) && !allowedExtraHosts(env).includes(host)) {
    refuse(`"${host}" is not loopback and is not listed in LOAD_TEST_ALLOWED_HOSTS`);
  }
  return url;
}

function assertStage(value) {
  const stage = Number(value);
  if (!STAGES.includes(stage)) refuse(`LOAD_TEST_STAGE must be one of ${STAGES.join(', ')}`);
  return stage;
}

function previousStage(stage) {
  const i = STAGES.indexOf(stage);
  return i > 0 ? STAGES[i - 1] : null;
}

module.exports = { assertLoadTarget, assertStage, previousStage, STAGES, LOOPBACK };
