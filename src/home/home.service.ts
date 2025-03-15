import { Injectable } from '@nestjs/common';
import { MessageDto } from './dto/message.dto';

@Injectable()
export class HomeService {
  getHello(): string {
    return 'Hello World!';
  }

  postMessage(messageDto: MessageDto): { message: string } {
    return { message: `You sent: ${messageDto.message}` };
  }
} 