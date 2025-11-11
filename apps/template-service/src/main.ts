import { NestFactory } from '@nestjs/core';
import { TemplateServiceModule } from './template-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TemplateServiceModule);
  await app.listen(process.env.TEMPLATE_SERVICE_PORT ?? 3003);
}
bootstrap();
