import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@app/queue';
import { QUEUE_NAMES } from '@app/common';
import { ConsumeMessage } from 'amqplib';
import { EmailService } from './email.service';

@Injectable()
export class EmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit() {
    await this.startConsuming();
  }

  private async startConsuming() {
    try {
      this.logger.log(`Starting to consume from queue: ${QUEUE_NAMES.EMAIL}`);

      await this.queueService.consume(
        QUEUE_NAMES.EMAIL,
        (msg: ConsumeMessage) => this.handleMessage(msg),
        { prefetch: 10 },
      );

      this.logger.log(`Successfully registered consumer for queue: ${QUEUE_NAMES.EMAIL}`);
    } catch (error) {
      this.logger.error('Failed to start consuming messages:', error);
      throw error;
    }
  }

  private async handleMessage(msg: ConsumeMessage) {
    const startTime = Date.now();
    const messageId = msg.properties.messageId || msg.properties.correlationId || 'unknown';

    try {
      const content = msg.content.toString();
      const notification = JSON.parse(content);

      this.logger.log(
        `Processing notification [${messageId}] ID: ${notification.notification_id} for user: ${notification.user_id}`,
      );

      // Validate message structure
      if (!notification.notification_id || !notification.user_id || !notification.template_code) {
        this.logger.error(`Invalid notification message [${messageId}]: missing required fields`);

        return;
      }

      // Process notification - fetches user, renders template, sends email
      const result = await this.emailService.processNotification(notification);

      const duration = Date.now() - startTime;

      if (result.status === 'sent') {
        this.logger.log(`Successfully processed notification [${messageId}] in ${duration}ms`);
      } else {
        this.logger.warn(`Failed to send email for notification [${messageId}]: ${result.error}`);

        // Check if error is retriable
        const isRetriable = this.isRetriableError(result.error);

        if (isRetriable) {
          throw new Error(result.error || 'Email sending failed');
        } else {
          this.logger.warn(`Non-retriable error for [${messageId}], acknowledging message`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error processing message [${messageId}]:`, error.message);

      throw error;
    }
  }

  // Determine if an error is retriable (temporary failure) or permanent
  private isRetriableError(errorMessage: string): boolean {
    if (!errorMessage) return false;

    const nonRetriablePatterns = [
      'not found',
      'invalid',
      'missing required',
      '404',
      '400',
      'Bad Request',
      'does not exist',
    ];

    const retriablePatterns = [
      'timeout',
      'connection',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'network',
      '500',
      '502',
      '503',
      'Service Unavailable',
    ];

    const lowerError = errorMessage.toLowerCase();

    // Check non-retriable first
    if (nonRetriablePatterns.some((pattern) => lowerError.includes(pattern.toLowerCase()))) {
      return false;
    }

    // Check retriable
    if (retriablePatterns.some((pattern) => lowerError.includes(pattern.toLowerCase()))) {
      return true;
    }

    return false;
  }

  async getStatus() {
    const isConnected = await this.queueService.healthCheck();
    return {
      connected: isConnected,
      queue: QUEUE_NAMES.EMAIL,
      queueType: 'RabbitMQ',
    };
  }
}
