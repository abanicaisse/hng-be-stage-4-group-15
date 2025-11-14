import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '@app/database';
import { CacheService } from '@app/cache';
import { Public } from '@app/common';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    this.logger.debug('Health check requested');

    const [database, cache] = await Promise.all([this.checkDatabase(), this.checkCache()]);

    const isHealthy = database && cache;
    const status = isHealthy ? 'up' : 'down';

    this.logger.log(`Health check result: ${status}`);

    return {
      status,
      timestamp: new Date().toISOString(),
      service: 'template-service',
      version: '1.0.0',
      dependencies: {
        database: database ? 'connected' : 'disconnected',
        cache: cache ? 'connected' : 'disconnected',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.databaseService.healthCheck();
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      await this.cacheService.healthCheck();
      return true;
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return false;
    }
  }
}
