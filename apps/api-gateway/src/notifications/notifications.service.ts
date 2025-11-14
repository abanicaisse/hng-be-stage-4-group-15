import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DatabaseService } from '@app/database';
import { QueueService } from '@app/queue';
import { CacheService } from '@app/cache';
import { IdempotencyService } from '@app/common';
import {
  CreateNotificationDto,
  NotificationType,
  NotificationStatus,
  QUEUE_NAMES,
  QueueMessage,
} from '@app/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly cacheService: CacheService,
    private readonly idempotencyService: IdempotencyService,
    private readonly httpService: HttpService,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto) {
    // Check idempotency
    const { isProcessed, result } = await this.idempotencyService.checkAndStore(
      createNotificationDto.request_id,
    );

    if (isProcessed) {
      this.logger.log(`Duplicate request detected: ${createNotificationDto.request_id}`);
      return result;
    }

    const user = await this.databaseService.user.findUnique({
      where: { id: createNotificationDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check user preferences
    if (createNotificationDto.notification_type === NotificationType.EMAIL && !user.email_enabled) {
      throw new ConflictException('User has disabled email notifications');
    }

    if (createNotificationDto.notification_type === NotificationType.PUSH && !user.push_enabled) {
      throw new ConflictException('User has disabled push notifications');
    }

    const notification = await this.databaseService.notification.create({
      data: {
        user_id: createNotificationDto.user_id,
        notification_type: createNotificationDto.notification_type,
        template_code: createNotificationDto.template_code,
        variables: createNotificationDto.variables as any,
        priority: createNotificationDto.priority,
        request_id: createNotificationDto.request_id,
        status: NotificationStatus.PENDING,
        metadata: createNotificationDto.metadata as any,
      },
    });

    const queueMessage: QueueMessage = {
      notification_id: notification.id,
      user_id: notification.user_id,
      notification_type: notification.notification_type as any,
      template_code: notification.template_code,
      variables: notification.variables as any,
      priority: notification.priority,
      request_id: notification.request_id,
      metadata: notification.metadata as any,
      retry_count: 0,
      created_at: notification.created_at,
    };

    // Publish to appropriate queue
    const routingKey =
      createNotificationDto.notification_type === NotificationType.EMAIL ? 'email' : 'push';

    await this.queueService.publish(routingKey, queueMessage, {
      priority: createNotificationDto.priority,
    });

    const response = {
      notification_id: notification.id,
      status: notification.status,
      request_id: notification.request_id,
      created_at: notification.created_at,
    };

    // Store in idempotency cache
    await this.idempotencyService.checkAndStore(createNotificationDto.request_id, response);
    this.logger.log(`Notification ${notification.id} created and queued`);

    return response;
  }
  async getNotification(notificationId: string) {
    const notification = await this.databaseService.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.formatNotificationResponse(notification);
  }
  async getNotificationsByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.databaseService.notification.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.databaseService.notification.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      data: notifications.map(this.formatNotificationResponse),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        has_next: skip + limit < total,
        has_previous: page > 1,
      },
    };
  }
  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    error?: string,
  ) {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };
    if (status === NotificationStatus.DELIVERED) {
      updateData.delivered_at = new Date();
    } else if (status === NotificationStatus.FAILED) {
      updateData.failed_at = new Date();
      updateData.error_message = error;
    }

    const notification = await this.databaseService.notification.update({
      where: { id: notificationId },
      data: updateData,
    });

    // Log the status change
    await this.databaseService.notificationLog.create({
      data: {
        notification_id: notificationId,
        event: `status_changed_to_${status}`,
        details: error ? { error } : {},
      },
    });

    this.logger.log(`Notification ${notificationId} status updated to ${status}`);

    return notification;
  }
  private formatNotificationResponse(notification: any) {
    return {
      id: notification.id,
      user_id: notification.user_id,
      notification_type: notification.notification_type,
      template_code: notification.template_code,
      status: notification.status,
      priority: notification.priority,
      created_at: notification.created_at,
      delivered_at: notification.delivered_at,
      failed_at: notification.failed_at,
      error_message: notification.error_message,
    };
  }
}
