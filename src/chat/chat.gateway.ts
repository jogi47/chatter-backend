import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from '../group/schemas/group.schema';
import { Message, MessageType } from '../message/schemas/message.schema';
import * as mongoose from 'mongoose';
import { S3Service } from '../common/services/s3.service';
import { EmbeddingsService } from '../common/services/embeddings.service';

interface AuthenticatedSocket extends Socket {
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  // Track typing users per group
  private typingUsers: Map<string, Set<string>> = new Map();

  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private s3Service: S3Service,
    private embeddingsService: EmbeddingsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Client is already authenticated by the adapter
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
    // Remove user from all typing lists
    this.typingUsers.forEach((typingSet, groupId) => {
      if (typingSet.has(client.user?.sub)) {
        typingSet.delete(client.user.sub);
        // Notify other users that this user has stopped typing
        this.server.to(groupId).emit('userStoppedTyping', {
          groupId,
          userId: client.user.sub,
        });
      }
    });

    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(client: AuthenticatedSocket, payload: { groupId: string }) {
    try {
      const { groupId } = payload;

      // Verify user is member of the group
      const group = await this.groupModel.findOne({  
        _id: new mongoose.Types.ObjectId(groupId),
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

  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(client: AuthenticatedSocket, payload: { groupId: string }) {
    const { groupId } = payload;
    await client.leave(groupId);
    this.logger.log(`Client ${client.id} left group ${groupId}`);
    return { status: 'left', groupId };
  }

  @SubscribeMessage('startTyping')
  async handleStartTyping(client: AuthenticatedSocket, payload: { groupId: string }) {
    try {
      const { groupId } = payload;
      // Verify user is member of the group
      const group = await this.groupModel.findOne({
        _id: new mongoose.Types.ObjectId(groupId),
        'members.userId': new mongoose.Types.ObjectId(client.user.sub),
      });

      if (!group) {
        throw new WsException('You are not a member of this group');
      }

      const member = group.members.find(
        m => m.userId.toString() === client.user.sub
      );

      // Add user to typing set for this group
      if (!this.typingUsers.has(groupId)) {
        this.typingUsers.set(groupId, new Set());
      }
      this.typingUsers.get(groupId).add(client.user.sub);

      // Emit typing status to all group members except the sender
      client.to(groupId).emit('userTyping', {
        groupId,
        userId: client.user.sub,
        username: member.username,
      });

      return { status: 'typing_started' };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(client: AuthenticatedSocket, payload: { groupId: string }) {
    try {
      const { groupId } = payload;
      // Verify user is member of the group
      const group = await this.groupModel.findOne({
         _id: new mongoose.Types.ObjectId(groupId),
        'members.userId': new mongoose.Types.ObjectId(client.user.sub),
      });

      if (!group) {
        throw new WsException('You are not a member of this group');
      }

      // Remove user from typing set
      if (this.typingUsers.has(groupId)) {
        this.typingUsers.get(groupId).delete(client.user.sub);
      }

      // Emit stop typing status to all group members except the sender
      client.to(groupId).emit('userStoppedTyping', {
        groupId,
        userId: client.user.sub,
      });

      return { status: 'typing_stopped' };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('groupMessage')
  async handleGroupMessage(client: AuthenticatedSocket, payload: { groupId: string, message: {content: string}  }) {
    try {
      const { groupId, message } = payload;
      const { content } = message;

      this.logger.log(`Message send on ${groupId} by ${client.id} - Message: ${content}`);
      // Verify user is member of the group
      const group = await this.groupModel.findOne({
        _id: new mongoose.Types.ObjectId(groupId),
        'members.userId': new mongoose.Types.ObjectId(client.user.sub),
      });

      if (!group) {
        throw new WsException('You are not a member of this group');
      }

      const member = group.members.find(
        m => m.userId.toString() === client.user.sub
      );

      // Generate embeddings for the message content
      let embeddings = null;
      try {
        embeddings = await this.embeddingsService.generateEmbeddings(content);
        if (!embeddings) {
          this.logger.warn(`Failed to generate embeddings for websocket message: ${content.substring(0, 50)}...`);
        } else {
          this.logger.log(`Generated embeddings for websocket message: ${embeddings.length} dimensions`);
        }
      } catch (error) {
        this.logger.error(`Error generating embeddings: ${error.message}`, error.stack);
        // Continue without embeddings if there's an error
      }

      // // Save message to database
      // const newMessage = new this.messageModel({
      //   group_id: new mongoose.Types.ObjectId(groupId),
      //   user_id: new mongoose.Types.ObjectId(client.user.sub),
      //   username: member.username,
      //   user_profile_image: member.profileImage,
      //   type: MessageType.TEXT,
      //   content: content,
      //   embeddings: embeddings,
      // });

      // const savedMessage = await newMessage.save();

      // Generate signed URL for user profile image
      const signedProfileImage = await this.s3Service.getSignedUrl(member.profileImage);

      // Broadcast message to all members in the group
      this.server.to(groupId).emit('groupMessage', {
        _id: message['_id'],
        group_id:groupId,
        user_id: client.user.sub,
        username: member.username,
        user_profile_image: signedProfileImage,
        content: content,
        type: MessageType.TEXT,
        createdAt: new Date(),
        updatedAt: new Date(),
        // embeddings: embeddings, No need to send embeddings to the client
      });

      // Clear typing status for the user who sent the message
      if (this.typingUsers.has(groupId)) {
        this.typingUsers.get(groupId).delete(client.user.sub);
      }

      // Emit stop typing status to all group members
      client.to(groupId).emit('userStoppedTyping', {
        groupId: groupId,
        userId: client.user.sub,
      });

      return { status: 'sent', messageId: message['_id'] };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('getTypingUsers')
  async handleGetTypingUsers(client: AuthenticatedSocket, groupId: string) {
    try {
      const group = await this.groupModel.findOne({
        _id: groupId,
        'members.userId': new mongoose.Types.ObjectId(client.user.sub),
      });

      if (!group) {
        throw new WsException('You are not a member of this group');
      }

      const typingUserIds = Array.from(this.typingUsers.get(groupId) || []);
      const typingMembers = group.members.filter(
        member => typingUserIds.includes(member.userId.toString())
      );

      return {
        groupId,
        typingUsers: typingMembers.map(member => ({
          userId: member.userId,
          username: member.username,
        })),
      };
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