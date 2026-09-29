import { BadRequestException } from '@nestjs/common';
import { FilesService, MAX_UPLOAD_BYTES } from './files.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://bucket.s3.ap-south-1.amazonaws.com/key?X-Amz-Signature=abc'),
}));
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('FilesService (private S3 storage)', () => {
  let service: FilesService;

  beforeEach(() => {
    process.env.AWS_REGION = 'ap-south-1';
    process.env.AWS_S3_BUCKET = 'curiousbees-test-bucket';
    service = new FilesService();
    (getSignedUrl as jest.Mock).mockClear();
  });

  describe('validateUpload', () => {
    it('accepts an allowed type with a matching extension and sanitizes the name', () => {
      expect(service.validateUpload('../../My Thesis (final).pdf', 'application/pdf', 1024)).toBe('My_Thesis_final_.pdf');
    });

    it('rejects disallowed content types', () => {
      expect(() => service.validateUpload('malware.exe', 'application/x-msdownload', 10)).toThrow(BadRequestException);
    });

    it('rejects an extension that does not match the declared type', () => {
      expect(() => service.validateUpload('script.html', 'application/pdf', 10)).toThrow(/does not match/);
    });

    it('rejects empty and oversized files', () => {
      expect(() => service.validateUpload('a.pdf', 'application/pdf', 0)).toThrow(BadRequestException);
      expect(() => service.validateUpload('a.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1)).toThrow(/maximum/);
    });
  });

  describe('object keys', () => {
    it('builds keys server-side under scope/scopeId/userId/uuid/name', () => {
      const key = service.buildObjectKey('workspaces', 'ws_1', 'user_1', 'paper.pdf');
      expect(key).toMatch(/^workspaces\/ws_1\/user_1\/[0-9a-f-]{36}\/paper\.pdf$/);
    });

    it('rejects identifiers that could manipulate the path', () => {
      expect(() => service.buildObjectKey('workspaces', '../other', 'user_1', 'a.pdf')).toThrow(BadRequestException);
    });

    it('flags traversal and malformed keys', () => {
      expect(service.isWellFormedKey('workspaces/ws/u/id/a.pdf')).toBe(true);
      expect(service.isWellFormedKey('workspaces/ws/../x/a.pdf')).toBe(false);
      expect(service.isWellFormedKey('workspaces//a.pdf')).toBe(false);
      expect(service.isWellFormedKey('workspaces/ws/u/id/a b.pdf')).toBe(false);
    });
  });

  it('signs uploads with content-type and content-length so size is enforced by S3', async () => {
    const result = await service.createPresignedUpload('workspaces/ws/u/id/a.pdf', 'application/pdf', 2048);
    const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect(command.input).toMatchObject({ Bucket: 'curiousbees-test-bucket', ContentLength: 2048, ContentType: 'application/pdf' });
    expect(options.expiresIn).toBeLessThanOrEqual(300);
    expect([...options.signableHeaders]).toEqual(expect.arrayContaining(['content-type', 'content-length']));
    expect(result.requiredHeaders).toEqual({ 'Content-Type': 'application/pdf' });
    expect(result).not.toHaveProperty('fileUrl');
  });

  it('signs downloads as attachments with a short expiry', async () => {
    await service.createPresignedDownload('workspaces/ws/u/id/a.pdf', 'Thesis.pdf');
    const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect(command.input.ResponseContentDisposition).toContain('attachment;');
    expect(options.expiresIn).toBeLessThanOrEqual(300);
  });

  it('refuses to sign when no bucket is configured', async () => {
    delete process.env.AWS_S3_BUCKET;
    const unconfigured = new FilesService();
    await expect(unconfigured.createPresignedUpload('k/a.pdf', 'application/pdf', 1)).rejects.toThrow(/not configured/);
  });
});
