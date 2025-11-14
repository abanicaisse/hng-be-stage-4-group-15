import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CommonModule } from '@app/common';
import { DatabaseModule } from '@app/database';
import { QueueModule } from '@app/queue';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter, LoggingInterceptor, TransformInterceptor } from '@app/common';
import { EmailServiceController } from './email-service.controller';
import { EmailServiceService } from './email-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/email-service/.env'],
    }),
    CommonModule,
    DatabaseModule,
    QueueModule,
    EmailModule,
    HealthModule,
  ],
  controllers: [EmailServiceController],
  providers: [
    EmailServiceService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class EmailServiceModule {}
