import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
