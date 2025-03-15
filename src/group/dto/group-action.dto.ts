import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GroupActionDto {
  @ApiProperty({ description: 'ID of the group' })
  @IsString()
  @IsNotEmpty()
  group_id: string;
}

export class ChangeOwnerDto extends GroupActionDto {
  @ApiProperty({ description: 'ID of the new owner' })
  @IsString()
  @IsNotEmpty()
  new_owner_id: string;
} 