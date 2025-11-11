import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CommonModule } from '@app/common';
import { DatabaseModule } from '@app/database';
import { CacheModule } from '@app/cache';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter, LoggingInterceptor, TransformInterceptor } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/user-service/.env'],
    }),
    CommonModule,
    DatabaseModule,
    CacheModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
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
export class UserServiceModule {}
