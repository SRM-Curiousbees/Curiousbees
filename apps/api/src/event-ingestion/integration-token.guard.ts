import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

/** Shortest token accepted, so a weak value can't be configured by accident. */
export const MIN_TOKEN_LENGTH = 32;

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** Tokens currently accepted: the active one, plus the previous one while a rotation is in progress. */
export function configuredIntegrationTokens(env: NodeJS.ProcessEnv = process.env): string[] {
  return [env.N8N_INTEGRATION_TOKEN, env.N8N_INTEGRATION_TOKEN_PREVIOUS]
    .map((t) => (t || '').trim())
    .filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/**
 * Machine-to-machine authentication for the n8n workflow. The workflow sends
 * `Authorization: Bearer <token>`; the token lives only in server environment
 * variables and in n8n's credential store. With no token configured the
 * integration is off and every request is refused.
 */
@Injectable()
export class IntegrationTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const tokens = configuredIntegrationTokens();
    if (tokens.length === 0) {
      throw new ServiceUnavailableException('Event ingestion is not configured.');
    }

    const req = context.switchToHttp().getRequest();
    const header: string = req.headers?.authorization || '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw new UnauthorizedException('Integration token required.');

    // Compare fixed-length digests so the comparison takes the same time for any input.
    const presented = digest(match[1]);
    const ok = tokens.some((t) => timingSafeEqual(presented, digest(t)));
    if (!ok) throw new UnauthorizedException('Invalid integration token.');

    req.integration = { name: 'n8n' };
    return true;
  }
}
