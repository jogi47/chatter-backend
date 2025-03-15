import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Username (a-z, 0-9, must not start with number)' })
  @IsString()
  @Matches(/^[a-z][a-z0-9]*$/, {
    message: 'Username must start with a letter and contain only lowercase letters and numbers',
  })
  username: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Profile image file', required: false, type: 'string', format: 'binary' })
  @IsOptional()
  profile_image?: Express.Multer.File;
} 