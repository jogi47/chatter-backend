import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import * as mongoose from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image'
}

@Schema({
  timestamps: true,
})
export class Message extends Document {
  @ApiProperty({ description: 'ID of the group this message belongs to' })
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
  group_id: mongoose.Types.ObjectId;

  @ApiProperty({ description: 'ID of the user who sent the message' })
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
  user_id: mongoose.Types.ObjectId;

  @ApiProperty({ description: 'Username of the sender' })
  @Prop({ required: true })
  username: string;

  @ApiProperty({ description: 'Profile image of the sender' })
  @Prop({ required: false })
  user_profile_image: string;

  @ApiProperty({ description: 'Type of message (text/image)' })
  @Prop({ required: true, enum: MessageType })
  type: MessageType;

  @ApiProperty({ description: 'Content of the message' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ description: 'Image URL if message type is image' })
  @Prop({ required: false })
  image_url?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message); 