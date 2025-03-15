import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('api/chat')
@Controller('api/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get chat server status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the chat server status and number of connected clients',
  })
  getStatus() {
    return this.chatService.getStatus();
  }

  @Get('user/:userId/connected')
  @ApiOperation({ summary: 'Check if a user is connected to chat' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the user is connected',
  })
  isUserConnected(@Param('userId') userId: string) {
    return this.chatService.isUserConnected(userId);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast a message to all connected clients' })
  @ApiResponse({
    status: 201,
    description: 'Returns the broadcast status',
    type: Object
  })
  broadcastMessage(@Body() chatMessageDto: ChatMessageDto) {
    return this.chatService.broadcastMessage(chatMessageDto);
  }
} 