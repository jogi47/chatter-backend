import { Module, Global } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { S3Service } from './services/s3.service';

@Global()
@Module({
  providers: [LoggerService, S3Service],
  exports: [LoggerService, S3Service],
})
export class CommonModule {} 