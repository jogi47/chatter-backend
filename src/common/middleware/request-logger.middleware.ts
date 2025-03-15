import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body, headers } = req;

    // Create a copy of the response's json method
    const originalJson = res.json;
    let responseBody: any;

    // Override the json method to capture the response body
    res.json = function(body) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // After the response is sent
    res.on('finish', () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const logData = {
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        requestHeaders: headers,
        requestBody: body,
        responseBody: responseBody,
      };

      // Asynchronously log the request/response details
      if (res.statusCode >= 400) {
        this.loggerService.error('API Error', logData).catch(() => {});
      } else {
        this.loggerService.log('API Request', logData).catch(() => {});
      }
    });

    next();
  }
} 