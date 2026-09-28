import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      });
      this.logger.log('✅ Supabase Backend Client initialized successfully.');
    } catch (e: any) {
      this.logger.error(`Failed to initialize Supabase Backend Client: ${e.message}`);
    }
  }

  /**
   * Verify the Supabase JWT Access Token via supabase.auth.getUser(token)
   */
  async verifyToken(token: string): Promise<{ id: string; email: string; user_metadata?: any; app_metadata?: any }> {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase Client is not initialized due to missing environment variables.');
    }

    try {
      this.logger.debug(`Verifying Supabase access token. tokenLength=${token.length}`);
      const { data, error } = await this.supabaseAdmin.auth.getUser(token);

      if (error || !data?.user) {
        throw new Error(error?.message || 'Invalid or expired Supabase token');
      }

      const email = data.user.email?.toLowerCase().trim();
      if (!email) {
        throw new Error('Supabase user does not have an email address.');
      }

      this.logger.debug(`Supabase token verified for user sub=${data.user.id}, email=${email}`);
      return {
        id: data.user.id,
        email,
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
      };
    } catch (e: any) {
      this.logger.error(`Supabase token verification failed: ${e.message}`);
      throw new Error(`Supabase token verification failed: ${e.message}`);
    }
  }
}
