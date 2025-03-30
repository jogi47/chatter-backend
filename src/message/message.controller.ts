import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto, CreateImageMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SmartReplyRequestDto, SmartReplyResponseDto } from './dto/smart-reply.dto';

@ApiTags('api/messages')
@Controller('api/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get all messages in a group' })
  @ApiResponse({ status: 200, description: 'Returns list of messages' })
  async getGroupMessages(@Param('groupId') groupId: string, @Request() req) {
    return this.messageService.getGroupMessages(groupId, req.user);
  }

  @Post('text')
  @ApiOperation({ summary: 'Post a text message to a group' })
  @ApiResponse({ status: 201, description: 'Message posted successfully' })
  async postTextMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Request() req,
  ) {
    return this.messageService.createTextMessage(createMessageDto, req.user);
  }

  @Post('image')
  @ApiOperation({ summary: 'Post an image message to a group' })
  @ApiResponse({ status: 201, description: 'Image message posted successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async postImageMessage(
    @Body() createImageMessageDto: CreateImageMessageDto,
    @UploadedFile() image: Express.Multer.File,
    @Request() req,
  ) {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG and GIF images are allowed.',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (image.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size allowed is 5MB.');
    }

    return this.messageService.createImageMessage(
      createImageMessageDto,
      image,
      req.user,
    );
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req,
  ) {
    return this.messageService.deleteMessage(messageId, req.user);
  }

  @Post('smart-replies')
  @ApiOperation({ summary: 'Get AI-generated smart reply suggestions for a group chat' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns an array of suggested replies',
    type: SmartReplyResponseDto
  })
  async getSmartReplies(
    @Body() smartReplyRequestDto: SmartReplyRequestDto,
    @Request() req,
  ): Promise<SmartReplyResponseDto> {
    return this.messageService.generateSmartReplies(
      smartReplyRequestDto.group_id,
      req.user,
    );
  }
} 