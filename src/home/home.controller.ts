import { Controller, Get, Post, Body } from '@nestjs/common';
import { HomeService } from './home.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessageDto } from './dto/message.dto';

@ApiTags('api/home')
@Controller('api/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello world message' })
  @ApiResponse({ status: 200, description: 'Returns a hello world message' })
  getHello(): string {
    return this.homeService.getHello();
  }

  @Post('message')
  @ApiOperation({ summary: 'Post a message' })
  @ApiResponse({ status: 201, description: 'Returns the posted message' })
  postMessage(@Body() messageDto: MessageDto): { message: string } {
    return this.homeService.postMessage(messageDto);
  }
} 