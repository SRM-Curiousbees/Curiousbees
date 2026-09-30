import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';

@Controller('users/onboarding')
@UseGuards(SupabaseAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('supervisor')
  async onboardSupervisor(
    @Req() req: any,
    @Body() body: {
      facultyId?: string;
      departmentId?: string;
      designation?: string;
      employeeId?: string;
      researchArea: string;
      maxScholars?: number;
    }
  ) {
    if (!body.researchArea || !body.researchArea.trim()) {
      throw new BadRequestException('Research Area is required.');
    }
    return this.onboardingService.onboardSupervisor(req.user.id, body);
  }

  @Post('scholar')
  async onboardScholar(
    @Req() req: any,
    @Body() body: {
      facultyId: string;
      departmentId: string;
      researchArea: string;
      supervisorId: string;
      researchDomain?: string;
      researchTopic?: string;
      proposalTitle?: string;
    }
  ) {
    if (!body.facultyId || !body.departmentId || !body.researchArea || !body.supervisorId) {
      throw new BadRequestException('All fields (facultyId, departmentId, researchArea, supervisorId) are required.');
    }
    return this.onboardingService.onboardScholar(req.user.id, body);
  }

  @Post('reset')
  async resetOnboarding(@Req() req: any) {
    return this.onboardingService.resetOnboarding(req.user.id);
  }
}
