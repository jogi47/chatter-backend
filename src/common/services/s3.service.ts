import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';

@Injectable()
export class S3Service {
  private s3: S3;

  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async getSignedUrl(url: string): Promise<string> {
    if (!url) return null;

    try {
      const bucketName = this.configService.get('AWS_BUCKET_NAME');
      const regionName = this.configService.get('AWS_REGION');
      const key = url.split(`${bucketName}.s3.${regionName}.amazonaws.com/`)[1];
      
      if (!key) return url;

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: bucketName,
        Key: key,
        Expires: 3600, // URL expires in 1 hour
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return url;
    }
  }
} 