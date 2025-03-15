import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatMessageDto } from './dto/chat-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedClients = 0;

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection', {
      status: 'connected',
      clientId: client.id,
      message: 'Successfully connected to the chat server',
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: ChatMessageDto): void {
    this.logger.log(`Message received from ${client.id}: ${payload.message}`);
    
    // Broadcast the message to all clients
    this.server.emit('message', {
      sender: client.id,
      content: payload.message,
      timestamp: new Date().toISOString(),
    });
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }
} 