import { Controller, Post, Body, Get } from '@nestjs/common';
import { EmailServiceService } from './email-service.service';

@Controller('email')
export class EmailServiceController {
  constructor(private readonly emailServiceService: EmailServiceService) {}

  @Post()
  sendEmail(@Body() dto: { to: string; subject?: string; body?: string }) {
    return this.emailServiceService.sendEmail(dto);
  }

  @Get()
  getEmails() {
    return this.emailServiceService.getAllEmails();
  }
}
