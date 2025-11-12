import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { TemplateServiceModule } from './template-service.module';

async function bootstrap() {
  const logger = new Logger('TemplateService');

  const app = await NestFactory.create(TemplateServiceModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Template Service API')
    .setDescription('Template management microservice for notification system')
    .setVersion('1.0.0')
    .addTag('Service Info', 'Service information endpoints')
    .addTag('Templates', 'Template management endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3003;
  await app.listen(port);

  logger.log(`=`.repeat(80));
  logger.log(`|=> Template Service running on: http://localhost:${port}`);
  logger.log(`|=> Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`|=> Health check: http://localhost:${port}/health`);
  logger.log(`|=> Template endpoints: http://localhost:${port}/api/v1/templates`);
  logger.log(`|=> Service info: http://localhost:${port}/info`);
  logger.log(`=`.repeat(80));
}

bootstrap().catch((error) => {
  console.error('Failed to start Template Service:', error);
  process.exit(1);
});
