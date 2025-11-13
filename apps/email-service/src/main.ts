import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { EmailServiceModule } from './email-service.module';
import { ConfigService } from '@nestjs/config';

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, just log it
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  // Give time for logs to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(EmailServiceModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Email Service API')
    .setDescription('Email notification microservice for sending emails via SMTP')
    .setVersion('1.0')
    .addTag('Service Info', 'Service information and status endpoints')
    .addTag('Email', 'Email sending and management endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('EMAIL_SERVICE_PORT', 3002);

  await app.listen(port);

  logger.log(`=`.repeat(60));
  logger.log(`|=> Email Service is running on: http://localhost:${port}`);
  logger.log(`|=> API docs at: http://localhost:${port}/api/docs`);
  logger.log(`|=> SMTP Host: ${configService.get<string>('SMTP_HOST')}`);
  logger.log(`|=> RabbitMQ: ${configService.get<string>('RABBITMQ_URL')}`);
  logger.log(`|=> Queue: email.queue (listening for messages)`);
  logger.log(`|=> User Service: ${configService.get<string>('USER_SERVICE_URL')}`);
  logger.log(`|=> Template Service: ${configService.get<string>('TEMPLATE_SERVICE_URL')}`);
  logger.log(`=`.repeat(60));
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start Email Service:', error);
  process.exit(1);
});
