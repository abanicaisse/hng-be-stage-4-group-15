import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CacheService } from '@app/cache';

@Injectable()
export class HealthCheckService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  async check() {
    const [database, cache] = await Promise.all([this.checkDatabase(), this.checkCache()]);

    const isHealthy = database && cache;

    return {
      status: isHealthy ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: '1.0.0',
      dependencies: {
        database: database ? 'connected' : 'disconnected',
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

  private async checkCache(): Promise<boolean> {
    try {
      return await this.cacheService.healthCheck();
    } catch {
      return false;
    }
  }
}
