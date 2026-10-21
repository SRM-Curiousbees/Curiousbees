import { createHmac } from 'crypto';

/** Load-test bearer token: lt1.<userId>.<HMAC-SHA256(secret, userId), base64url>. Local test value only. */
export function signLoadTestToken(secret: string, userId: string): string {
  return `lt1.${userId}.${createHmac('sha256', secret).update(userId).digest('base64url')}`;
}
