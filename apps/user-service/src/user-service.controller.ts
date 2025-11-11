import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserServiceService } from './user-service.service';
import { Public } from '@app/common';

@ApiTags('Service Info')
@Controller()
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'User Service root endpoint' })
  getHello(): string {
    return this.userServiceService.getHello();
  }

  @Get('info')
  @Public()
  @ApiOperation({ summary: 'Get service information' })
  getInfo() {
    return this.userServiceService.getServiceInfo();
  }
}
