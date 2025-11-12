import { NestFactory } from '@nestjs/core';
import { EmailServiceModule } from './email-service.module';

async function bootstrap() {
  const app = await NestFactory.create(EmailServiceModule);
  await app.listen(process.env.EMAIL_SERVICE_PORT || 3002);
  console.log(' Email Service running on port 3002');
}
bootstrap();
