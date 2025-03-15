import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({
  timestamps: true,
})
export class User extends Document {
  @ApiProperty({ description: 'Username of the user' })
  @Prop({ required: true, unique: true })
  username: string;

  @ApiProperty({ description: 'Email of the user' })
  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty({ description: 'Hashed password of the user' })
  @Prop({ required: true })
  password: string;

  @ApiProperty({ description: 'Profile image URL of the user' })
  @Prop({ required: false, default: null })
  profile_image: string;
}

export const UserSchema = SchemaFactory.createForClass(User); 