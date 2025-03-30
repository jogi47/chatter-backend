import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageType } from './schemas/message.schema';
import { Group } from '../group/schemas/group.schema';
import { CreateMessageDto, CreateImageMessageDto } from './dto/create-message.dto';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';
import { S3Service } from '../common/services/s3.service';
import { EmbeddingsService } from '../common/services/embeddings.service';
import { AIService } from '../common/services/ai.service';
import { SmartReplyResponseDto } from './dto/smart-reply.dto';

@Injectable()
export class MessageService {
  private s3: S3;
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Group.name) private groupModel: Model<Group>,
    private configService: ConfigService,
    private s3Service: S3Service,
    private embeddingsService: EmbeddingsService,
    private aiService: AIService,
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async getGroupMessages(groupId: string, currentUser: any) {
    // Verify user is member of the group
    const group = await this.groupModel.findOne({
      _id: groupId,
      'members.userId': new mongoose.Types.ObjectId(currentUser.sub),
    });

    if (!group) {
      throw new UnauthorizedException('You are not a member of this group');
    }

    const messages = await this.messageModel
      .find({ group_id: new mongoose.Types.ObjectId(groupId) })
      .sort({ createdAt: 1 });

    // Generate signed URLs for message images and user profile images
    return Promise.all(
      messages.map(async (message) => {
        const result = {
          ...message.toObject(),
          user_profile_image: await this.s3Service.getSignedUrl(message.user_profile_image),
          image_url: message.type === MessageType.IMAGE ? 
            await this.s3Service.getSignedUrl(message.image_url) : 
            message.image_url,
        };
        
        // Don't send the embeddings to client
        delete result.embeddings;
        return result;
      })
    );
  }

  async createTextMessage(createMessageDto: CreateMessageDto, currentUser: any) {
    // Verify user is member of the group
    const group = await this.groupModel.findOne({
      _id: createMessageDto.group_id,
      'members.userId': new mongoose.Types.ObjectId(currentUser.sub),
    });

    if (!group) {
      throw new UnauthorizedException('You are not a member of this group');
    }

    const member = group.members.find(
      m => m.userId.toString() === currentUser.sub
    );

    // Generate embeddings for the message content
    let embeddings = null;
    try {
      embeddings = await this.embeddingsService.generateEmbeddings(createMessageDto.content);
      if (!embeddings) {
        this.logger.warn(`Failed to generate embeddings for message: ${createMessageDto.content.substring(0, 50)}...`);
      }
    } catch (error) {
      this.logger.error(`Error generating embeddings: ${error.message}`, error.stack);
      // Continue without embeddings if there's an error
    }

    // Save message with original URLs and embeddings
    const message = await this.messageModel.create({
      group_id: new mongoose.Types.ObjectId(createMessageDto.group_id),
      user_id: new mongoose.Types.ObjectId(currentUser.sub),
      username: member.username,
      user_profile_image: member.profileImage,
      type: MessageType.TEXT,
      content: createMessageDto.content,
      embeddings: embeddings,
    });

    // Return message with pre-signed URLs
    const messageObj = message.toObject();
    
    // Don't send the embeddings to client
    delete messageObj.embeddings;
    
    return {
      ...messageObj,
      user_profile_image: await this.s3Service.getSignedUrl(messageObj.user_profile_image),
    };
  }

  async createImageMessage(createImageMessageDto: CreateImageMessageDto, image: Express.Multer.File, currentUser: any) {
    // Verify user is member of the group
    const group = await this.groupModel.findOne({
      _id: createImageMessageDto.group_id,
      'members.userId': new mongoose.Types.ObjectId(currentUser.sub),
    });

    if (!group) {
      throw new UnauthorizedException('You are not a member of this group');
    }

    const member = group.members.find(
      m => m.userId.toString() === currentUser.sub
    );

    // Upload image to S3 and get original URL
    const imageUrl = await this.uploadMessageImage(
      image,
      createImageMessageDto.group_id
    );
    
    // For image messages, we'll store embeddings of the caption/content if available
    let embeddings = null;
    if (createImageMessageDto.content && createImageMessageDto.content !== 'Image message') {
      try {
        embeddings = await this.embeddingsService.generateEmbeddings(createImageMessageDto.content);
      } catch (error) {
        this.logger.error(`Error generating embeddings for image caption: ${error.message}`, error.stack);
        // Continue without embeddings if there's an error
      }
    }

    // Save message with original URLs
    const message = await this.messageModel.create({
      group_id: new mongoose.Types.ObjectId(createImageMessageDto.group_id),
      user_id: new mongoose.Types.ObjectId(currentUser.sub),
      username: member.username,
      user_profile_image: member.profileImage,
      type: MessageType.IMAGE,
      content: createImageMessageDto.content || 'Image message',
      image_url: imageUrl,
      embeddings: embeddings,
    });

    // Return message with pre-signed URLs
    const messageObj = message.toObject();
    
    // Don't send the embeddings to client
    delete messageObj.embeddings;
    
    return {
      ...messageObj,
      user_profile_image: await this.s3Service.getSignedUrl(messageObj.user_profile_image),
      image_url: await this.s3Service.getSignedUrl(messageObj.image_url),
    };
  }

  async deleteMessage(messageId: string, currentUser: any) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user owns the message
    if (message.user_id.toString() !== currentUser.sub) {
      throw new UnauthorizedException('You can only delete your own messages');
    }

    // If it's an image message, delete from S3
    if (message.type === MessageType.IMAGE && message.image_url) {
      await this.deleteMessageImage(message.image_url);
    }

    return this.messageModel.findByIdAndDelete(messageId);
  }

  private async uploadMessageImage(file: Express.Multer.File, groupId: string): Promise<string> {
    const bucketName = this.configService.get('AWS_BUCKET_NAME');
    const key = `${groupId}/${Date.now()}-${file.originalname}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const result = await this.s3.upload(uploadParams).promise();
      return result.Location;
    } catch (error) {
      throw new BadRequestException('Failed to upload image');
    }
  }

  private async deleteMessageImage(imageUrl: string) {
    try {
      const bucketName = this.configService.get('AWS_BUCKET_NAME');
      const key = imageUrl.split('/').slice(-2).join('/');

      await this.s3.deleteObject({
        Bucket: bucketName,
        Key: key,
      }).promise();
    } catch (error) {
      console.error('Failed to delete image from S3:', error);
    }
  }

  /**
   * Generate smart reply suggestions for a group chat
   * @param groupId ID of the group to generate replies for
   * @param currentUser The currently logged in user
   * @returns Object containing suggested replies
   */
  async generateSmartReplies(groupId: string, currentUser: any): Promise<SmartReplyResponseDto> {
    // Verify user is member of the group
    const group = await this.groupModel.findOne({
      _id: new mongoose.Types.ObjectId(groupId),
      'members.userId': new mongoose.Types.ObjectId(currentUser.sub),
    });

    if (!group) {
      throw new UnauthorizedException('You are not a member of this group');
    }

    // Find the current user in the group members to get their username
    const currentMember = group.members.find(
      member => member.userId.toString() === currentUser.sub
    );

    if (!currentMember) {
      throw new BadRequestException('User information not found');
    }

    // Get all messages from the group
    const allMessages = await this.messageModel
      .find({ group_id: new mongoose.Types.ObjectId(groupId) })
      .sort({ createdAt: 1 })
      .lean();  // Convert to plain JavaScript objects

    if (allMessages.length === 0) {
      // If there are no messages, return generic replies
      return {
        suggestions: [
          "Hello everyone!",
          "How is everyone doing today?",
          "Any updates on the project?"
        ]
      };
    }

    // Get the most recent message to compare against
    const lastMessage = allMessages[allMessages.length - 1];
    
    // Skip the similarity selection if the last message doesn't have embeddings
    if (!lastMessage.embeddings || lastMessage.embeddings.length === 0) {
      this.logger.warn('Last message has no embeddings, using 5 most recent messages instead');
      
      // Use the 5 most recent messages if we can't do similarity comparison
      const recentMessages = allMessages.slice(-5);
      
      // Generate smart replies using the AI service
      const suggestions = await this.aiService.generateSmartReplies(
        recentMessages,
        currentMember.username
      );

      return { suggestions };
    }

    // Choose the similarity algorithm to use
    // Options: 'cosine', 'euclidean', 'dot-product'
    const similarityAlgo = this.configService.get<string>('SIMILARITY_ALGORITHM') || 'dot-product';
    
    // Filter messages with embeddings and calculate similarity scores
    const messagesWithSimilarity = allMessages
      .filter(msg => msg.embeddings && msg.embeddings.length > 0)
      .map(msg => {
        let similarityScore: number;
        
        switch (similarityAlgo) {
          case 'euclidean':
            // For Euclidean distance, lower is better, so we invert the score
            // to maintain the "higher is more similar" ordering
            const distance = this.embeddingsService.calculateEuclideanDistance(
              lastMessage.embeddings,
              msg.embeddings
            );
            similarityScore = distance === Number.MAX_VALUE ? -1 : 1 / (1 + distance);
            break;
          
          case 'cosine':
            similarityScore = this.embeddingsService.calculateCosineSimilarity(
              lastMessage.embeddings,
              msg.embeddings
            );
            break;
            
          case 'dot-product':
          default:
            similarityScore = this.embeddingsService.calculateDotProduct(
              lastMessage.embeddings,
              msg.embeddings
            );
            break;
        }
        
        return {
          ...msg,
          similarity: similarityScore
        };
      })
      .filter(msg => msg.similarity > -1); // Filter out invalid similarities
    
    // Sort by similarity (descending) and take the top 5
    const topMessages = messagesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    
    this.logger.log(`Selected ${topMessages.length} contextually relevant messages using ${similarityAlgo} algorithm`);
    
    if (topMessages.length === 0) {
      // If no messages with valid embeddings, use 5 most recent messages
      this.logger.warn('No messages with valid embeddings found, using 5 most recent messages instead');
      const recentMessages = allMessages.slice(-5);
      
      // Generate smart replies using the AI service
      const suggestions = await this.aiService.generateSmartReplies(
        recentMessages,
        currentMember.username
      );

      return { suggestions };
    }

    // Generate smart replies using the AI service with the selected messages
    const suggestions = await this.aiService.generateSmartReplies(
      topMessages,
      currentMember.username
    );

    return { suggestions };
  }
} 