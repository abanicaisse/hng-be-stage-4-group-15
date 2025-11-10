import { Controller, Get } from '@nestjs/common';
import { TemplateServiceService } from './template-service.service';

@Controller()
export class TemplateServiceController {
  constructor(private readonly templateServiceService: TemplateServiceService) {}

  @Get()
  getHello(): string {
    return this.templateServiceService.getHello();
  }
}
