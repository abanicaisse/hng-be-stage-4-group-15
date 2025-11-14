import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto, EmailStatusDto } from '../dto/email.dto';
import { Public } from '@app/common';

@ApiTags('Email')
@Controller('api/v1/email')
@Public() // All endpoints are public for internal service
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a single email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  async sendEmail(@Body() emailDto: SendEmailDto): Promise<EmailStatusDto> {
    return this.emailService.sendEmail(emailDto);
  }

  @Post('send-template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email using a template' })
  @ApiResponse({ status: 200, description: 'Template email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or template data' })
  async sendTemplateEmail(@Body() emailDto: SendEmailDto): Promise<EmailStatusDto> {
    return this.emailService.sendTemplateEmail(emailDto);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send multiple emails in bulk' })
  @ApiResponse({ status: 200, description: 'Bulk emails sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bulk email data' })
  async sendBulkEmails(@Body() emails: SendEmailDto[]): Promise<EmailStatusDto[]> {
    return this.emailService.sendBulkEmails(emails);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check email service health' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getHealth() {
    return this.emailService.getHealthStatus();
  }
}
