import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from '../group/schemas/group.schema';
import { Message, MessageType } from '../message/schemas/message.schema';
import * as mongoose from 'mongoose';

interface AuthenticatedSocket extends Socket {
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtAuthGuard)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private jwtService: JwtService,
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.connectedClients.set(client.id, client);
      this.logger.log(`Client connected: ${client.id} (User: ${client.user?.username})`);

      client.emit('connection', {
        status: 'connected',
        clientId: client.id,
        message: 'Successfully connected to the chat server',
        user: client.user,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinGroup')
  async handleJoinGroup(client: AuthenticatedSocket, groupId: string) {
    try {
      // Verify user is member of the group
      const group = await this.groupModel.findOne({
        _id: groupId,
        'members.userId': new mongoose.Types.ObjectId(client.user.sub),
      });

      if (!group) {
        throw new WsException('You are not a member of this group');
      }

      await client.join(groupId);
      this.logger.log(`Client ${client.id} joined group ${groupId}`);

      return { status: 'joined', groupId };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(client: AuthenticatedSocket, groupId: string) {
    await client.leave(groupId);
    this.logger.log(`Client ${client.id} left group ${groupId}`);
    return { status: 'left', groupId };
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('groupMessage')
  async handleGroupMessage(client: AuthenticatedSocket, payload: { groupId: string, message: string }) {
    try {
      const { groupId, message } = payload;

      // Verify user is member of the group
      const group = await this.groupModel.findOne({
        _id: groupId,
        'members.userId': new mongoose.Types.ObjectId(client.user.sub),
      });

      if (!group) {
        throw new WsException('You are not a member of this group');
      }

      const member = group.members.find(
        m => m.userId.toString() === client.user.sub
      );

      // Save message to database
      const newMessage = new this.messageModel({
        group_id: new mongoose.Types.ObjectId(groupId),
        user_id: new mongoose.Types.ObjectId(client.user.sub),
        username: member.username,
        user_profile_image: member.profileImage,
        type: MessageType.TEXT,
        content: message,
      });

      await newMessage.save();

      // Broadcast message to all members in the group
      this.server.to(groupId).emit('groupMessage', {
        messageId: newMessage._id,
        groupId,
        userId: client.user.sub,
        username: member.username,
        userProfileImage: member.profileImage,
        content: message,
        // timestamp: newMessage.createdAt,
      });

      return { status: 'sent', messageId: newMessage._id };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  isClientConnected(userId: string): boolean {
    return Array.from(this.connectedClients.values()).some(
      client => client.user?.sub === userId
    );
  }
} 