import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ description: 'Name of the group' })
  @IsString()
  @IsNotEmpty()
  group_name: string;

  @ApiProperty({ 
    description: 'Comma-separated list of user IDs to be added as members',
    example: '507f1f77bcf86cd799439011,507f191e810c19729de860ea' 
  })
  @IsString()
  @IsNotEmpty()
  member_ids: string;

  @ApiProperty({ description: 'Group image file', type: 'string', format: 'binary', required: false })
  group_image?: Express.Multer.File;
} 