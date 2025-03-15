import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    description: 'The message to send',
    example: 'Hello everyone!',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
} 