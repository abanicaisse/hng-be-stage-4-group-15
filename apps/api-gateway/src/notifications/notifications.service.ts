import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly httpService: HttpService) {}

  async createNotification(dto: {
    type: 'email' | 'push';
    to: string;
    subject?: string;
    body?: string;
    message?: string;
  }) {
    if (dto.type === 'email') {
      const res = await firstValueFrom(
        this.httpService.post('http://localhost:3002/email', {
          to: dto.to,
          subject: dto.subject,
          body: dto.body,
        }),
      );
      this.logger.log(`Email queued for ${dto.to}`);
      return res.data;
    }

    if (dto.type === 'push') {
      const res = await firstValueFrom(
        this.httpService.post('http://localhost:3003/push', {
          to: dto.to,
          message: dto.message,
        }),
      );
      this.logger.log(`Push queued for ${dto.to}`);
      return res.data;
    }

    return { success: false, message: 'Invalid notification type' };
  }
}
