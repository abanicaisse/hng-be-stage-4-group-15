import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CacheModule } from '@app/cache';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health.service';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [HealthController],
  providers: [HealthCheckService],
})
export class HealthModule {}
