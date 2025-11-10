import { Injectable } from '@nestjs/common';

@Injectable()
export class PushServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
