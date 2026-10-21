import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, isAuthApiError, SupabaseClient } from '@supabase/supabase-js';

/** Upper bound for one Supabase Auth call; a slow Supabase must not hold API requests open. */
export const DEFAULT_SUPABASE_AUTH_TIMEOUT_MS = 5000;

export function supabaseAuthTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const value = Number(env.SUPABASE_AUTH_TIMEOUT_MS);
  return Number.isInteger(value) && value >= 500 && value <= 30000 ? value : DEFAULT_SUPABASE_AUTH_TIMEOUT_MS;
}

/**
 * Why a token could not be verified. `INVALID_TOKEN`: Supabase rejected it (the
 * caller must sign in again). `AUTH_UNAVAILABLE`: Supabase could not be asked
 * (timeout, network or server error, missing configuration); access is still
 * denied, but the session itself may be fine.
 */
export class TokenVerificationError extends Error {
  constructor(
    readonly reason: 'INVALID_TOKEN' | 'AUTH_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'TokenVerificationError';
  }
}

/** fetch with a hard deadline, combined with any signal the caller passed. */
export function fetchWithTimeout(timeoutMs: number, baseFetch: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    const deadline = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    return baseFetch(input, { ...init, signal });
  };
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseAdmin: SupabaseClient | null = null;

  get client(): SupabaseClient {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase Client is not initialized.');
    }
    return this.supabaseAdmin;
  }

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Server-only key. Never fall back to the public anon key: it cannot perform admin operations.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
      return;
    }

    try {
      this.logger.log('Initializing Supabase Backend Client...');
      this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: { fetch: fetchWithTimeout(supabaseAuthTimeoutMs()) },
      });
      this.logger.log('✅ Supabase Backend Client initialized successfully.');
    } catch (e: any) {
      this.logger.error(`Failed to initialize Supabase Backend Client: ${e.message}`);
    }
  }

  /**
   * Verify the Supabase JWT Access Token via supabase.auth.getUser(token).
   * Fails closed: every outcome other than a verified user throws a
   * TokenVerificationError.
   */
  async verifyToken(token: string): Promise<{ id: string; email: string; emailVerified: boolean; user_metadata?: any; app_metadata?: any }> {
    if (!this.supabaseAdmin) {
      throw new TokenVerificationError('AUTH_UNAVAILABLE', 'Supabase Client is not initialized due to missing environment variables.');
    }

    let data: Awaited<ReturnType<SupabaseClient['auth']['getUser']>>['data'];
    let error: Awaited<ReturnType<SupabaseClient['auth']['getUser']>>['error'];
    try {
      this.logger.debug(`Verifying Supabase access token. tokenLength=${token.length}`);
      ({ data, error } = await this.supabaseAdmin.auth.getUser(token));
    } catch (e: any) {
      throw new TokenVerificationError('AUTH_UNAVAILABLE', `Supabase token verification failed: ${e?.message || e}`);
    }

    if (error) {
      // Only an answer from Supabase rejecting the token (4xx) means the token is bad.
      // Timeouts, network failures, 5xx and unparseable responses are outages.
      const rejected = isAuthApiError(error) && typeof error.status === 'number' && error.status >= 400 && error.status < 500;
      throw new TokenVerificationError(
        rejected ? 'INVALID_TOKEN' : 'AUTH_UNAVAILABLE',
        `Supabase token verification failed: ${error.message}`,
      );
    }
    if (!data?.user) {
      throw new TokenVerificationError('INVALID_TOKEN', 'Supabase token verification failed: no user for this token');
    }

    const email = data.user.email?.toLowerCase().trim();
    if (!email) {
      throw new TokenVerificationError('INVALID_TOKEN', 'Supabase user does not have an email address.');
    }

    this.logger.debug(`Supabase token verified for user sub=${data.user.id}`);
    return {
      id: data.user.id,
      email,
      emailVerified: Boolean(data.user.email_confirmed_at),
      user_metadata: data.user.user_metadata,
      app_metadata: data.user.app_metadata,
    };
  }
}
