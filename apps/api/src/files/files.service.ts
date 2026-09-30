import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/** Allowed upload types, mapped to the file extensions accepted for each. */
export const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/zip': ['zip'],
  'application/x-zip-compressed': ['zip'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
};

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

const UPLOAD_URL_TTL_SECONDS = 300;
const DOWNLOAD_URL_TTL_SECONDS = 300;

// Keys are always built server-side from ids we control; anything else is rejected.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SAFE_KEY = /^[A-Za-z0-9/_.-]{1,512}$/;

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
  /** Headers the browser must send unchanged with the PUT (they are signed). */
  requiredHeaders: Record<string, string>;
}

/**
 * Private-bucket object storage. The browser uploads and downloads directly
 * against S3 with short-lived presigned URLs; this service never proxies file
 * bytes. It knows nothing about who may access what — callers (e.g.
 * WorkspacesService) must authorize against the owning database record first.
 *
 * Credentials come from the default AWS provider chain: the ECS task role in
 * production, the developer's AWS profile locally. No static keys.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || '';

    const config: S3ClientConfig = { region: process.env.AWS_REGION || 'ap-south-1' };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    // Local testing against an S3-compatible server (e.g. MinIO). Never used in production.
    if (process.env.NODE_ENV !== 'production' && process.env.AWS_S3_ENDPOINT) {
      config.endpoint = process.env.AWS_S3_ENDPOINT;
      config.forcePathStyle = true;
    }
    this.s3Client = new S3Client(config);
  }

  /** Validates type, extension and size, and returns a filename safe for object keys. */
  validateUpload(filename: string, contentType: string, sizeBytes: number): string {
    const type = (contentType || '').toLowerCase().trim();
    const allowedExtensions = ALLOWED_UPLOAD_TYPES[type];
    if (!allowedExtensions) {
      throw new BadRequestException(
        `File type ${contentType} is not permitted. Allowed: PDF, Word, PowerPoint, Excel, ZIP, JPEG/PNG/WebP images, text and CSV.`,
      );
    }

    const baseName = (filename || '').split(/[\\/]/).pop() || '';
    const extension = baseName.includes('.') ? baseName.split('.').pop()!.toLowerCase() : '';
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(`File extension ".${extension}" does not match content type ${type}.`);
    }

    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestException('sizeBytes must be a positive integer.');
    }
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(`File size exceeds the maximum of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
    }

    const safeName = baseName
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._]+/, '')
      .slice(-120);
    return safeName || `file.${extension}`;
  }

  /** Builds `<scope>/<scopeId>/<userId>/<uuid>/<name>`, so keys can't collide or be chosen by clients. */
  buildObjectKey(
    scope: 'workspaces' | 'threads' | 'attachments',
    scopeId: string,
    userId: string,
    safeName: string,
  ): string {
    if (!SAFE_ID.test(scopeId) || !SAFE_ID.test(userId)) {
      throw new BadRequestException('Invalid identifier for object key.');
    }
    return `${scope}/${scopeId}/${userId}/${randomUUID()}/${safeName}`;
  }

  isWellFormedKey(key: string): boolean {
    return SAFE_KEY.test(key) && !key.split('/').some((part) => part === '' || part === '.' || part === '..');
  }

  async createPresignedUpload(storageKey: string, contentType: string, sizeBytes: number): Promise<PresignedUpload> {
    this.assertConfigured();
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: contentType,
      // Signed: S3 rejects the PUT unless the body is exactly this many bytes.
      ContentLength: sizeBytes,
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return {
      uploadUrl,
      storageKey,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      requiredHeaders: { 'Content-Type': contentType },
    };
  }

  /** Confirms an uploaded object exists and re-checks its real size and type. Deletes it if invalid. */
  async verifyUploadedObject(storageKey: string): Promise<{ size: number; contentType: string }> {
    this.assertConfigured();
    let head;
    try {
      head = await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: storageKey }));
    } catch (e: any) {
      if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') {
        throw new BadRequestException('Uploaded file was not found in storage. Please upload it again.');
      }
      throw e;
    }

    const size = Number(head.ContentLength || 0);
    const contentType = (head.ContentType || '').toLowerCase();
    if (size <= 0 || size > MAX_UPLOAD_BYTES || !ALLOWED_UPLOAD_TYPES[contentType]) {
      await this.deleteObject(storageKey);
      throw new BadRequestException('Uploaded file failed validation and was removed.');
    }
    return { size, contentType };
  }

  async createPresignedDownload(
    storageKey: string,
    downloadName?: string,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    this.assertConfigured();
    const effectiveName = downloadName || storageKey.split('/').pop() || 'download';
    const asciiName = effectiveName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(effectiveName)}`,
    });
    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
    return { downloadUrl, expiresIn: DOWNLOAD_URL_TTL_SECONDS };
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: storageKey }));
    } catch (e: any) {
      this.logger.error(`Failed to delete object ${storageKey}: ${e.message}`);
    }
  }

  private assertConfigured() {
    if (!this.bucketName) {
      throw new ServiceUnavailableException('File storage is not configured.');
    }
  }
}
