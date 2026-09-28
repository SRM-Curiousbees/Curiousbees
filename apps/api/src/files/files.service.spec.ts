import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.ap-south-1.amazonaws.com/test-bucket/signed-url'),
}));

describe('FilesService (AWS S3 Presigned Uploads)', () => {
  let service: FilesService;

  beforeEach(async () => {
    process.env.AWS_REGION = 'ap-south-1';
    process.env.AWS_S3_BUCKET = 'curiousbees-test-bucket';

    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesService],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject unpermitted MIME types', async () => {
    await expect(
      service.getPresignedUploadUrl('user-1', 'malware.exe', 'application/x-msdownload', 1000)
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject files exceeding 50 MB limit', async () => {
    const sixtyMB = 60 * 1024 * 1024;
    await expect(
      service.getPresignedUploadUrl('user-1', 'large_dataset.zip', 'application/zip', sixtyMB)
    ).rejects.toThrow(BadRequestException);
  });

  it('should generate valid presigned upload URL for permitted academic document', async () => {
    const result = await service.getPresignedUploadUrl(
      'user-1',
      'Quantum_Computing_Paper.pdf',
      'application/pdf',
      5 * 1024 * 1024
    );

    expect(result.uploadUrl).toBeDefined();
    expect(result.objectKey).toContain('research-documents/user-1/');
    expect(result.objectKey).toContain('Quantum_Computing_Paper.pdf');
    expect(result.bucket).toBe('curiousbees-test-bucket');
    expect(result.expiresIn).toBe(900);
  });
});
