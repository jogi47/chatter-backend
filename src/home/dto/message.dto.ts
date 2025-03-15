import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MessageDto {
  @ApiProperty({
    description: 'The message to send',
    example: 'Hello, NestJS!',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
} 