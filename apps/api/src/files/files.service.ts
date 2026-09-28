import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucketName = process.env.AWS_S3_BUCKET || 'curiousbees-research-files';

    const clientConfig: any = {
      region: this.region,
    };

    // If explicit static credentials are provided in env, use them;
    // otherwise SDK automatically leverages IAM instance profile / ECS task role
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async getPresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
    sizeBytes: number,
    prefix: string = 'research-documents',
  ) {
    if (!filename || !contentType) {
      throw new BadRequestException('Filename and contentType are required.');
    }

    if (!ALLOWED_MIME_TYPES.has(contentType.toLowerCase())) {
      throw new BadRequestException(
        `File type ${contentType} is not permitted. Allowed: PDF, Word, PowerPoint, Excel, ZIP, Images, Text.`
      );
    }

    if (sizeBytes && sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds maximum permitted limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
      );
    }

    // Sanitize filename to prevent directory traversal or unsafe S3 characters
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${prefix}/${userId}/${Date.now()}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'uploaded-by': userId,
        'original-filename': encodeURIComponent(filename),
      },
    });

    const expiresInSeconds = 900; // 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${objectKey}`;

    return {
      uploadUrl,
      objectKey,
      fileUrl,
      bucket: this.bucketName,
      region: this.region,
      expiresIn: expiresInSeconds,
    };
  }

  async getPresignedDownloadUrl(objectKey: string): Promise<string> {
    if (!objectKey) {
      throw new BadRequestException('Object key is required.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
