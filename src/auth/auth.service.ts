import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private s3: S3;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async register(registerDto: RegisterDto, profileImage?: Express.Multer.File) {
    const { username, email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new BadRequestException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload profile image if provided
    let profileImageUrl = null;
    if (profileImage) {
      profileImageUrl = await this.uploadProfileImage(profileImage, username);
    }

    // Create new user
    const user = new this.userModel({
      username,
      email,
      password: hashedPassword,
      profile_image: profileImageUrl,
    });

    await user.save();

    return {
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user._id,
      username: user.username,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image,
      },
    };
  }

  private async uploadProfileImage(file: Express.Multer.File, username: string): Promise<string> {
    const bucketName = this.configService.get('AWS_BUCKET_NAME');
    const key = `user/${username}-${Date.now()}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL: 'public-read',
    };

    try {
      const result = await this.s3.upload(uploadParams).promise();
      return result.Location;
    } catch (error) {
      throw new BadRequestException('Failed to upload profile image');
    }
  }
} 