import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { QueueService } from '@app/queue';
import { CacheService } from '@app/cache';

@Injectable()
export class HealthCheckService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly cacheService: CacheService,
  ) {}

  async check() {
    const [database, queue, cache] = await Promise.all([
      this.checkDatabase(),
      this.checkQueue(),
      this.checkCache(),
    ]);

    const isHealthy = database && queue && cache;

    return {
      status: isHealthy ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
      dependencies: {
        database: database ? 'connected' : 'disconnected',
        queue: queue ? 'connected' : 'disconnected',
        cache: cache ? 'connected' : 'disconnected',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      return await this.databaseService.healthCheck();
    } catch {
      return false;
    }
  }

  private async checkQueue(): Promise<boolean> {
    try {
      return await this.queueService.healthCheck();
    } catch {
      return false;
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      return await this.cacheService.healthCheck();
    } catch {
      return false;
    }
  }
}
