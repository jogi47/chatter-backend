import { Module, Global } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { S3Service } from './services/s3.service';
import { EmbeddingsService } from './services/embeddings.service';

@Global()
@Module({
  providers: [LoggerService, S3Service, EmbeddingsService],
  exports: [LoggerService, S3Service, EmbeddingsService],
})
export class CommonModule {} 