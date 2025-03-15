import { Controller, Get, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('api/chat')
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get chat server status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the chat server status',
    type: Object
  })
  getStatus() {
    return this.chatService.getStatus();
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