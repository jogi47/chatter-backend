import { Injectable } from '@nestjs/common';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(private readonly chatGateway: ChatGateway) {}

  getStatus(): { status: string; connectedClients: number } {
    const connectedClients = this.chatGateway.getConnectedClients();
    return { 
      status: 'Chat server is running', 
      connectedClients 
    };
  }

  broadcastMessage(chatMessageDto: ChatMessageDto): { success: boolean; message: string } {
    this.chatGateway.server.emit('message', {
      sender: 'Server',
      content: chatMessageDto.message,
      timestamp: new Date().toISOString(),
    });
    
    return { 
      success: true, 
      message: `Message "${chatMessageDto.message}" broadcasted to all clients` 
    };
  }

  isUserConnected(userId: string): { connected: boolean } {
    return { 
      connected: this.chatGateway.isClientConnected(userId) 
    };
  }
} 