import { Injectable } from '@nestjs/common';
import { HelloDto } from './dto/hello.dto';

@Injectable()
export class SampleService {
  getHello(name?: string): HelloDto {
    const message = name ? `Hello ${name}!` : 'Hello World!';
    return { message };
  }
}
