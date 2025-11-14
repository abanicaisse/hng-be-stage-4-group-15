import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TemplateServiceService {
  private readonly logger = new Logger(TemplateServiceService.name);

  getHello(): string {
    this.logger.log('Template Service called');
    return 'Template Service is running!';
  }

  getServiceInfo() {
    return {
      service: 'template-service',
      version: '1.0.0',
      status: 'operational',
      description: 'Template management microservice for notifications',
      features: [
        'Store and manage notification templates',
        'Variable substitution with Handlebars',
        'Template versioning',
        'Multi-language support',
      ],
      endpoints: {
        templates: '/api/v1/templates',
        health: '/health',
        docs: '/api/docs',
      },
    };
  }
}
