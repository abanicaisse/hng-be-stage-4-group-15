import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailServiceService } from './email-service.service';
import { Public } from '@app/common';

@ApiTags('Service Info')
@Controller()
export class EmailServiceController {
  constructor(private readonly emailServiceService: EmailServiceService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Email Service root endpoint' })
  getHello(): string {
    return this.emailServiceService.getHello();
  }

  @Get('info')
  @Public()
  @ApiOperation({ summary: 'Get service information' })
  getInfo() {
    return this.emailServiceService.getServiceInfo();
  }
}
