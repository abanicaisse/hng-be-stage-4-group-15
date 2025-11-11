import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from './health.service';
import { Public } from '@app/common';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint for user service' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async check() {
    return this.healthCheckService.check();
  }
}
