import { z } from 'zod';

const nonEmptyCommaList = (message: string) =>
  z.string().refine((val) => val.split(',').some((v) => v.trim().length > 0), message);

// Treats `NAME=` (an unset value copied from .env.example) the same as a missing variable.
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid connection URL').optional(),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  ALLOWED_EMAIL_DOMAINS: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().optional(),
  MAIL_FROM_EMAIL: z.string().email().optional(),
  MAIL_FROM_NAME: z.string().optional(),
  OPENSEARCH_ENDPOINT: z.string().url().optional(),
  OPENSEARCH_REGION: z.string().optional(),
  OPENSEARCH_INDEX: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ZOOM_CLIENT_ID: z.string().optional(),
  ZOOM_CLIENT_SECRET: z.string().optional(),
  ENABLE_CRON: z.enum(['true', 'false']).optional(),
  ENABLE_SWAGGER: z.enum(['true', 'false']).optional(),
  // n8n email → event ingestion. Optional: with no token the integration endpoints refuse all requests.
  N8N_INTEGRATION_TOKEN: z.preprocess(blankToUndefined, z.string().min(32, 'N8N_INTEGRATION_TOKEN must be at least 32 characters').optional()),
  N8N_INTEGRATION_TOKEN_PREVIOUS: z.preprocess(blankToUndefined, z.string().min(32, 'N8N_INTEGRATION_TOKEN_PREVIOUS must be at least 32 characters').optional()),
  EVENT_INGESTION_TRUSTED_SENDERS: z.string().optional(),
});

/**
 * Production must be fully and explicitly configured. Anything that would
 * otherwise fall back to a development default is required here, so a
 * misconfigured task fails at boot instead of running with unsafe behaviour.
 */
const productionSchema = baseSchema.extend({
  DATABASE_URL: z.string().url('DATABASE_URL is required in production'),
  FRONTEND_URL: z.string().url().refine((v) => v.startsWith('https://'), 'FRONTEND_URL must use https in production'),
  ALLOWED_EMAIL_DOMAINS: nonEmptyCommaList('ALLOWED_EMAIL_DOMAINS must list at least one domain'),
  SUPABASE_URL: z.string().url('SUPABASE_URL is required in production for auth'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required in production for auth'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required in production'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required in production'),
  BREVO_API_KEY: z.string().min(1, 'BREVO_API_KEY is required in production'),
  MAIL_FROM_EMAIL: z.string().email('MAIL_FROM_EMAIL or BREVO_SENDER_EMAIL is required in production'),
});

export type EnvConfig = z.infer<typeof baseSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const isProduction = config.NODE_ENV === 'production';
  const mailFromEmail = config.MAIL_FROM_EMAIL || config.BREVO_SENDER_EMAIL;
  const mailFromName = config.MAIL_FROM_NAME || config.BREVO_SENDER_NAME;
  const directUrl = config.DIRECT_URL || config.DATABASE_URL;

  const input = {
    ...config,
    SUPABASE_URL: config.SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_URL,
    DIRECT_URL: directUrl,
    MAIL_FROM_EMAIL: mailFromEmail,
    MAIL_FROM_NAME: mailFromName,
  };

  const result = (isProduction ? productionSchema : baseSchema).safeParse(input);

  if (!result.success) {
    const problems = result.error.errors.map((err) => `  - [${err.path.join('.') || 'Global'}]: ${err.message}`);
    if (isProduction) {
      throw new Error(`Invalid production configuration:\n${problems.join('\n')}`);
    }
    console.warn(`\n⚠️  Invalid or missing environment variables detected:\n${problems.join('\n')}\n`);
    return config;
  }
  return { ...config, ...result.data };
}
