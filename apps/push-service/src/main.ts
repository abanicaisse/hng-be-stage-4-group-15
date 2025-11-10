import { NestFactory } from '@nestjs/core';
import { PushServiceModule } from './push-service.module';

async function bootstrap() {
  const app = await NestFactory.create(PushServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
