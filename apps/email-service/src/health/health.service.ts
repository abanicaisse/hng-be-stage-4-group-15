import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async check() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'email-service',
      dependencies: {
        database: await this.checkDatabase(),
      },
    };

    const allHealthy = Object.values(health.dependencies).every(
      (dep: any) => dep.status === 'connected',
    );

    if (!allHealthy) {
      health.status = 'unhealthy';
    }

    return health;
  }

  private async checkDatabase() {
    try {
      await this.databaseService.$queryRaw`SELECT 1`;
      return {
        status: 'connected',
        message: 'Database connection is healthy',
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'disconnected',
        message: error.message,
      };
    }
  }
}
