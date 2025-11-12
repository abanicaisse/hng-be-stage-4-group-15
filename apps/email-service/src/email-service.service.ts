import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailServiceService {
  private readonly logger = new Logger(EmailServiceService.name);

  getHello(): string {
    this.logger.log('Email service root endpoint called');
    return 'Email Service is running!';
  }

  getServiceInfo() {
    return {
      service: 'email-service',
      version: '1.0.0',
      status: 'operational',
      description: 'Email notification microservice',
      endpoints: {
        email: '/api/v1/email',
        health: '/health',
        docs: '/api/docs',
      },
    };
  }
}
