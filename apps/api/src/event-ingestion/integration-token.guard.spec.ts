import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { IntegrationTokenGuard } from './integration-token.guard';

const TOKEN = 'a'.repeat(40);
const OLD = 'b'.repeat(40);

function ctx(authorization?: string) {
  const req: any = { headers: authorization ? { authorization } : {} };
  return { req, context: { switchToHttp: () => ({ getRequest: () => req }) } as any };
}

describe('IntegrationTokenGuard', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('refuses everything when no token is configured', () => {
    delete process.env.N8N_INTEGRATION_TOKEN;
    delete process.env.N8N_INTEGRATION_TOKEN_PREVIOUS;
    expect(() => new IntegrationTokenGuard().canActivate(ctx(`Bearer ${TOKEN}`).context)).toThrow(ServiceUnavailableException);
  });

  it('ignores a configured token that is too short', () => {
    process.env.N8N_INTEGRATION_TOKEN = 'short-token';
    expect(() => new IntegrationTokenGuard().canActivate(ctx('Bearer short-token').context)).toThrow(ServiceUnavailableException);
  });

  it('rejects missing, malformed and wrong tokens', () => {
    process.env.N8N_INTEGRATION_TOKEN = TOKEN;
    const guard = new IntegrationTokenGuard();
    expect(() => guard.canActivate(ctx().context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx(TOKEN).context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx(`Bearer ${'c'.repeat(40)}`).context)).toThrow(UnauthorizedException);
  });

  it('accepts the active token and marks the request as coming from n8n', () => {
    process.env.N8N_INTEGRATION_TOKEN = TOKEN;
    const { req, context } = ctx(`Bearer ${TOKEN}`);
    expect(new IntegrationTokenGuard().canActivate(context)).toBe(true);
    expect(req.integration).toEqual({ name: 'n8n' });
  });

  it('accepts the previous token during a rotation', () => {
    process.env.N8N_INTEGRATION_TOKEN = TOKEN;
    process.env.N8N_INTEGRATION_TOKEN_PREVIOUS = OLD;
    expect(new IntegrationTokenGuard().canActivate(ctx(`Bearer ${OLD}`).context)).toBe(true);
  });
});
