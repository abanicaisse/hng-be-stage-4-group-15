import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Shared libraries
import { CommonModule } from '@app/common';
import { DatabaseModule } from '@app/database';
import { CacheModule } from '@app/cache';

// Feature modules
import { TemplatesModule } from './template/template.module';
import { HealthModule } from './health/health.module';

// Root service
import { TemplateServiceController } from './template-service.controller';
import { TemplateServiceService } from './template-service.service';

// Global filters and interceptors
import { AllExceptionsFilter, LoggingInterceptor, TransformInterceptor } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/template-service/.env'],
    }),
    CommonModule,
    DatabaseModule,
    CacheModule,
    TemplatesModule,
    HealthModule,
  ],
  controllers: [TemplateServiceController],
  providers: [
    TemplateServiceService,
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
export class TemplateServiceModule {}
