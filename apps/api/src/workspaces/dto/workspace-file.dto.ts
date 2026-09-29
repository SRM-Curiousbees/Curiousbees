import { IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Max, Min, ValidateIf } from 'class-validator';
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '../../files/files.service';

export class RequestFileUploadDto {
  @IsString()
  @Length(1, 255)
  filename!: string;

  @IsString()
  @IsIn(Object.keys(ALLOWED_UPLOAD_TYPES), { message: 'contentType is not an allowed file type.' })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES, { message: `sizeBytes must not exceed ${MAX_UPLOAD_BYTES} bytes (50 MB).` })
  sizeBytes!: number;
}

/**
 * Registers a workspace file: either an object uploaded via a presigned URL
 * (`storageKey`) or an external link (`url`). Exactly one must be provided.
 */
export class AddWorkspaceFileDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @ValidateIf((o) => o.url === undefined || o.storageKey !== undefined)
  @IsString()
  @Length(1, 512)
  storageKey?: string;

  @ValidateIf((o) => o.storageKey === undefined || o.url !== undefined)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'url must be an http(s) link.' })
  @Length(1, 2048)
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;
}
