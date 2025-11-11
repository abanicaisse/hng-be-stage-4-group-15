import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);

  getHello(): string {
    this.logger.log('Root API Gateway endpoint accessed');
    return 'Notification System API Gateway is running!';
  }

  getServiceInfo() {
    return {
      service: 'api-gateway',
      version: '1.0.0',
      status: 'operational',
      description: 'API Gateway for distributed notification system',
      endpoints: {
        auth: {
          login: 'POST /auth/login',
          register: 'POST /auth/register',
        },
        notifications: {
          create: 'POST /api/v1/notifications',
          getOne: 'GET /api/v1/notifications/:id',
          getByUser: 'GET /api/v1/notifications/user/:userId',
        },
        health: 'GET /health',
        docs: 'GET /api/docs',
      },
      microservices: {
        userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
        templateService: process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3003',
      },
    };
  }
}
