import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ description: 'Name of the group' })
  @IsString()
  @IsNotEmpty()
  group_name: string;

  @ApiProperty({ description: 'Array of user IDs to be added as members' })
  @IsArray()
  @ArrayMinSize(1)
  member_ids: string[];

  @ApiProperty({ description: 'Group image file', type: 'string', format: 'binary', required: false })
  group_image?: Express.Multer.File;
} 