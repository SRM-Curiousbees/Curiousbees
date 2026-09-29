import { Module } from '@nestjs/common';
import { FilesService } from './files.service';

/**
 * Storage primitives only. Upload/download endpoints live on the modules that
 * own the records (e.g. WorkspacesController), so every URL is authorized
 * against a database record.
 */
@Module({
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
