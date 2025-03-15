import { 
  Controller, 
  Post, 
  Body, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiConsumes,
  ApiBody 
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation errors or user already exists' 
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('profile_image'))
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    if (profileImage) {
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(profileImage.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG and GIF images are allowed.',
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (profileImage.size > maxSize) {
        throw new BadRequestException(
          'File too large. Maximum size allowed is 5MB.',
        );
      }
    }

    return this.authService.register(registerDto, profileImage);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully logged in',
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid credentials' 
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
} 