import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserServiceService {
  private readonly logger = new Logger(UserServiceService.name);

  getHello(): string {
    this.logger.log('User service root endpoint called');
    return 'User Service is running!';
  }

  getServiceInfo() {
    return {
      service: 'user-service',
      version: '1.0.0',
      status: 'operational',
      description: 'User management microservice',
      endpoints: {
        users: '/api/v1/users',
        health: '/health',
        docs: '/api/docs',
      },
    };
  }
}
