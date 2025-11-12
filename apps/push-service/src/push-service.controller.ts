import { Controller, Post, Body, Get } from '@nestjs/common';
import { PushServiceService } from './push-service.service';

@Controller('push')
export class PushServiceController {
  constructor(private readonly pushServiceService: PushServiceService) {}

  @Post()
  sendPush(@Body() dto: { to: string; message: string }) {
    return this.pushServiceService.sendPush(dto);
  }

  @Get()
  getPushes() {
    return this.pushServiceService.getAllPushes();
  }
}