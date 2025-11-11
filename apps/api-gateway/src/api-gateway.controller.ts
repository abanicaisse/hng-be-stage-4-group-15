import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@app/common';
import { ApiGatewayService } from './api-gateway.service';

@ApiTags('Service Info')
@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'API Gateway root endpoint' })
  getHello(): string {
    return this.apiGatewayService.getHello();
  }

  @Get('info')
  @Public()
  @ApiOperation({ summary: 'Get API Gateway information' })
  getInfo() {
    return this.apiGatewayService.getServiceInfo();
  }
}
