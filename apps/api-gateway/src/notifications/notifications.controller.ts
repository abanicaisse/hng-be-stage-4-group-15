import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notify')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  send(@Body() dto: any) {
    return this.notificationsService.createNotification(dto);
  }
}
