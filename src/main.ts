import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Set up global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('NestJS API Documentation')
    .setVersion('1.0')
    .addTag('api/swagger')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/swagger', app, document);
  
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap(); 