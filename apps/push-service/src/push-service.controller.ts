import { Controller, Get } from '@nestjs/common';
import { PushServiceService } from './push-service.service';

@Controller()
export class PushServiceController {
  constructor(private readonly pushServiceService: PushServiceService) {}

  @Get()
  getHello(): string {
    return this.pushServiceService.getHello();
  }
}
