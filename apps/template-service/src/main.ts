import { NestFactory } from '@nestjs/core';
import { TemplateServiceModule } from './template-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TemplateServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
