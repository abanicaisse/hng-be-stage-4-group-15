import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage, Options } from 'amqplib';
import { QUEUE_NAMES, EXCHANGE_NAMES } from '@app/common';

export interface QueueConfig {
  urls: string[];
  heartbeat?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  async onModuleInit() {
    await this.connect();
    await this.setupExchangesAndQueues();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    const config: QueueConfig = {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password@localhost:5672'],
      heartbeat: 60,
    };

    this.connection = amqp.connect(config.urls, {
      heartbeatIntervalInSeconds: config.heartbeat,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => {
      this.logger.log('RabbitMQ connected');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.error('RabbitMQ disconnected', err);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        this.logger.log('RabbitMQ channel created');
      },
    });
  }

  private async setupExchangesAndQueues() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      // Create exchanges
      await channel.assertExchange(EXCHANGE_NAMES.NOTIFICATIONS, 'direct', {
        durable: true,
      });

      await channel.assertExchange(EXCHANGE_NAMES.DLX, 'direct', {
        durable: true,
      });

      // Create queues with dead letter exchange
      const queueOptions = {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGE_NAMES.DLX,
          'x-message-ttl': 86400000, // 24 hours
        },
      };

      await channel.assertQueue(QUEUE_NAMES.EMAIL, queueOptions);
      await channel.assertQueue(QUEUE_NAMES.PUSH, queueOptions);
      await channel.assertQueue(QUEUE_NAMES.STATUS, { durable: true });

      // Create dead letter queue
      await channel.assertQueue(QUEUE_NAMES.FAILED, { durable: true });

      // Bind queues to exchange
      await channel.bindQueue(QUEUE_NAMES.EMAIL, EXCHANGE_NAMES.NOTIFICATIONS, 'email');
      await channel.bindQueue(QUEUE_NAMES.PUSH, EXCHANGE_NAMES.NOTIFICATIONS, 'push');
      await channel.bindQueue(QUEUE_NAMES.FAILED, EXCHANGE_NAMES.DLX, 'failed');

      this.logger.log('Exchanges and queues setup completed');
    });
  }

  async publish(
    routingKey: string,
    message: any,
    options?: { priority?: number; persistent?: boolean },
  ): Promise<void> {
    try {
      const publishOptions: Options.Publish = {
        persistent: options?.persistent ?? true,
        priority: options?.priority ?? 5,
        contentType: 'application/json',
        timestamp: Date.now(),
      };

      await this.channelWrapper.publish(
        EXCHANGE_NAMES.NOTIFICATIONS,
        routingKey,
        message,
        publishOptions,
      );

      this.logger.debug(`Message published to ${routingKey}: ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to ${routingKey}`, error);
      throw error;
    }
  }

  async consume(
    queueName: string,
    onMessage: (msg: ConsumeMessage) => Promise<void>,
    options?: { prefetch?: number },
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.prefetch(options?.prefetch ?? 1);

      await channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              await onMessage(msg);
              channel.ack(msg);
              this.logger.debug(`Message processed from ${queueName}`);
            } catch (error) {
              this.logger.error(`Error processing message from ${queueName}`, error);

              const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
              const maxRetries = 3;

              if (retryCount < maxRetries) {
                // Retry with exponential backoff
                const delay = Math.pow(2, retryCount) * 1000;
                setTimeout(() => {
                  channel.nack(msg, false, true);
                }, delay);

                this.logger.log(`Retrying message (attempt ${retryCount}/${maxRetries})`);
              } else {
                // Move to dead letter queue after max retries
                channel.nack(msg, false, false);
                this.logger.error(`Message moved to DLQ after ${maxRetries} failed attempts`);
              }
            }
          }
        },
        {
          noAck: false,
        },
      );

      this.logger.log(`Consumer registered for queue: ${queueName}`);
    });
  }

  async publishToQueue(queueName: string, message: any): Promise<void> {
    try {
      const publishOptions: Options.Publish = {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      };

      await this.channelWrapper.sendToQueue(queueName, message, publishOptions);

      this.logger.debug(`Message sent to queue ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to send message to queue ${queueName}`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.connection?.isConnected() ?? false;
  }

  private async disconnect() {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    this.logger.log('RabbitMQ connection closed');
  }
}
