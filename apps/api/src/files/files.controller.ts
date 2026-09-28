import { Controller, Post, Get, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { FilesService } from './files.service';
import { Throttle } from '@nestjs/throttler';

export class PresignedUploadDto {
  filename!: string;
  contentType!: string;
  sizeBytes!: number;
  prefix?: string;
}

@Controller('files')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presigned-upload')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createPresignedUpload(@Req() req: any, @Body() body: PresignedUploadDto) {
    if (!body?.filename || !body?.contentType) {
      throw new BadRequestException('filename and contentType are required in request body.');
    }
    return this.filesService.getPresignedUploadUrl(
      req.user.id,
      body.filename,
      body.contentType,
      body.sizeBytes || 0,
      body.prefix || 'research-documents'
    );
  }

  @Get('presigned-download')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getPresignedDownload(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('Query parameter "key" is required.');
    }
    const downloadUrl = await this.filesService.getPresignedDownloadUrl(key);
    return { downloadUrl };
  }
}
