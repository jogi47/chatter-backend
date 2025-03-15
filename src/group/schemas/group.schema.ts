import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum GroupRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

export class GroupMember {
  @ApiProperty({ description: 'User ID of the member' })
  userId: string;

  @ApiProperty({ description: 'Username of the member' })
  username: string;

  @ApiProperty({ description: 'Profile image URL of the member' })
  profileImage: string;

  @ApiProperty({ description: 'Role of the member in the group', enum: GroupRole })
  role: GroupRole;
}

@Schema({
  timestamps: true,
})
export class Group extends Document {
  @ApiProperty({ description: 'Name of the group' })
  @Prop({ required: true })
  group_name: string;

  @ApiProperty({ description: 'Group image URL' })
  @Prop({ required: false, default: null })
  group_image: string;

  @ApiProperty({ description: 'List of group members with their roles' })
  @Prop({ type: [Object], required: true })
  members: GroupMember[];
}

export const GroupSchema = SchemaFactory.createForClass(Group); 