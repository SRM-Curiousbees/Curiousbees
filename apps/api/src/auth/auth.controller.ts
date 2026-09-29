import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SupabaseAuthGuard, AllowAccessDenial } from './supabase.guard';

@Controller('auth')
export class AuthController {
  /**
   * Session bootstrap for the frontend. Always answers 200 for a valid
   * Supabase session and reports whether the caller may use CuriousBees.
   * `reason` is one of the guard's AccessDenialReason codes.
   */
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @AllowAccessDenial()
  getMe(@Req() req: any) {
    if (req.accessDenial) {
      return {
        success: true,
        access: false,
        reason: req.accessDenial,
        email: req.userEmail,
      };
    }

    return {
      success: true,
      access: true,
      user: req.user,
    };
  }
}
