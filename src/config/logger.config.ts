import { registerAs } from '@nestjs/config';
import * as os from 'os';
import * as path from 'path';

export default registerAs('logger', () => ({
  directory: path.join(os.homedir(), 'Logs'),
  datePattern: 'YYYY-MM-DD-HH',
  maxSize: '20m',
  maxFiles: '14d',
})); 