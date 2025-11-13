import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { UserServiceModule } from './user-service.module';
import { AllExceptionsFilter, LoggingInterceptor, TransformInterceptor } from '@app/common';

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

async function bootstrap() {
  const logger = new Logger('UserService');
  const app = await NestFactory.create(UserServiceModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('User management microservice')
    .setVersion('1.0')
    .addTag('Users')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`=`.repeat(60));
  logger.log(`|=> User Service running on: http://localhost:${port}`);
  logger.log(`|=> API docs at: http://localhost:${port}/api/docs`);
  logger.log(`|=> Health check: http://localhost:${port}/health`);
  logger.log(`=`.repeat(60));
}

bootstrap().catch((error) => {
  console.error('Failed to start User Service:', error);
  process.exit(1);
});
