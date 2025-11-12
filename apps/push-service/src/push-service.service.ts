import { Injectable } from '@nestjs/common';
import { Push } from './push-service.types';

@Injectable()
export class PushServiceService {
  private pushesQueue: Push[] = [];

  sendPush(dto: { to: string; message: string }) {
    const push: Push = {
      id: Date.now(),
      to: dto.to,
      message: dto.message,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    this.pushesQueue.push(push);

    // simulate delivery
    setTimeout(() => {
      push.status = 'DELIVERED';
      push.deliveredAt = new Date().toISOString();
      console.log('Push delivered to:', push.to, push.message);
    }, 1000);

    return { success: true, message: 'Push queued', push };
  }

  getAllPushes() {
    return this.pushesQueue;
  }
}
