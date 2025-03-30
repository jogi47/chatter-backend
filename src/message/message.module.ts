import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { Group, GroupSchema } from '../group/schemas/group.schema';
import { S3Service } from '../common/services/s3.service';
import { EmbeddingsService } from '../common/services/embeddings.service';
import { AIService } from '../common/services/ai.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [MessageController],
  providers: [MessageService, S3Service, EmbeddingsService, AIService],
})
export class MessageModule {} 