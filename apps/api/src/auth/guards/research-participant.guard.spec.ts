import { ForbiddenException } from '@nestjs/common';
import { ResearchParticipantGuard } from './research-participant.guard';

describe('ResearchParticipantGuard', () => {
  const guard = new ResearchParticipantGuard();

  const mockContext = (user: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('allows RESEARCH_SCHOLAR and RESEARCH_SUPERVISOR', () => {
    expect(guard.canActivate(mockContext({ id: 'u1', role: 'RESEARCH_SCHOLAR' }))).toBe(true);
    expect(guard.canActivate(mockContext({ id: 'u2', role: 'RESEARCH_SUPERVISOR' }))).toBe(true);
  });

  it('blocks INSTITUTE_ADMIN and unauthenticated requests', () => {
    expect(() => guard.canActivate(mockContext({ id: 'a1', role: 'INSTITUTE_ADMIN' }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockContext(null))).toThrow(ForbiddenException);
  });
});
