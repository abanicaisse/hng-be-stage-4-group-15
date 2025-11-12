import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TemplateServiceService } from './template-service.service';
import { Public } from '@app/common';

@ApiTags('Service Info')
@Controller()
export class TemplateServiceController {
  constructor(private readonly templateServiceService: TemplateServiceService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Template service root endpoint' })
  getHello(): string {
    return this.templateServiceService.getHello();
  }

  @Get('info')
  @Public()
  @ApiOperation({ summary: 'Get template service information' })
  getInfo() {
    return this.templateServiceService.getServiceInfo();
  }
}
