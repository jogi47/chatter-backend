import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID of the group to post message to' })
  @IsString()
  @IsNotEmpty()
  group_id: string;

  @ApiProperty({ description: 'Content of the message' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateImageMessageDto {
  @ApiProperty({ description: 'ID of the group to post image to' })
  @IsString()
  @IsNotEmpty()
  group_id: string;

  @ApiProperty({ description: 'Optional caption for the image', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Image file', type: 'string', format: 'binary' })
  image: Express.Multer.File;
} 