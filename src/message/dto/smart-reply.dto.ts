import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SmartReplyRequestDto {
  @ApiProperty({ description: 'ID of the group to get smart replies for' })
  @IsString()
  @IsNotEmpty()
  group_id: string;
}

export class SmartReplyResponseDto {
  @ApiProperty({ description: 'Array of suggested replies', type: [String] })
  suggestions: string[];
} 