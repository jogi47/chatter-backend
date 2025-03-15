import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const logsDir = this.configService.get<string>('logger.directory');
    
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.DailyRotateFile({
          dirname: logsDir,
          filename: '%DATE%/api-logs.log',
          datePattern: this.configService.get<string>('logger.datePattern'),
          zippedArchive: true,
          maxSize: this.configService.get<string>('logger.maxSize'),
          maxFiles: this.configService.get<string>('logger.maxFiles'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              }`;
            })
          ),
        }),
      ],
    });
  }

  async log(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  async error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  async warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }
} 