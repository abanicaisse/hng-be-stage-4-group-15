import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { MailerService } from '@nestjs-modules/mailer';
import { DatabaseService } from '@app/database';
import { NotificationStatus } from '@app/common';
import * as nodemailer from 'nodemailer';
import { SendEmailDto, EmailStatusDto, EmailPriority } from '../dto/email.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly templateServiceUrl: string;
  private readonly userServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly httpService: HttpService,
    private readonly databaseService: DatabaseService,
  ) {
    this.maxRetries = this.configService.get<number>('MAX_RETRY_ATTEMPTS', 3);
    this.retryDelay = this.configService.get<number>('RETRY_DELAY', 5000);
    this.templateServiceUrl = this.configService.get<string>(
      'TEMPLATE_SERVICE_URL',
      'http://localhost:3003',
    );
    this.userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://localhost:3001',
    );

    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const isMailHog = smtpHost === 'localhost' || smtpHost === '127.0.0.1';

    const smtpConfig: any = {
      host: smtpHost,
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      ignoreTLS: isMailHog,
      pool: !isMailHog,
      maxConnections: isMailHog ? 1 : 5,
      maxMessages: isMailHog ? 1 : 100,
    };

    if (smtpUser) {
      smtpConfig.auth = {
        user: smtpUser,
        pass: this.configService.get<string>('SMTP_PASS'),
      };
    }

    if (!isMailHog) {
      smtpConfig.requireTLS = true;
      smtpConfig.tls = {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      };
    }

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendEmail(emailDto: SendEmailDto, retryCount = 0): Promise<EmailStatusDto> {
    const startTime = Date.now();
    this.logger.log(`Sending email to ${emailDto.to} (Attempt ${retryCount + 1})`);

    try {
      const mailOptions = this.buildMailOptions(emailDto);

      // Send email using the transporter
      const info = await this.transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Email sent successfully to ${emailDto.to} in ${duration}ms. MessageId: ${info.messageId}`,
      );

      // Update notification status if notificationId is provided
      if (emailDto.notificationId) {
        await this.updateNotificationStatus(emailDto.notificationId, NotificationStatus.DELIVERED);
      }

      return {
        notificationId: emailDto.notificationId || 'unknown',
        status: 'sent',
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailDto.to}:`, error.message);

      // Retry logic
      if (retryCount < this.maxRetries) {
        this.logger.log(`Retrying email to ${emailDto.to} in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay);
        return this.sendEmail(emailDto, retryCount + 1);
      }

      if (emailDto.notificationId) {
        await this.updateNotificationStatus(
          emailDto.notificationId,
          NotificationStatus.FAILED,
          error.message,
        );
      }

      return {
        notificationId: emailDto.notificationId || 'unknown',
        status: 'failed',
        error: error.message,
        retryCount,
      };
    }
  }

  // Process notification from queue - fetches user, renders template, and sends email
  async processNotification(notification: any): Promise<EmailStatusDto> {
    this.logger.log(`📧 Processing notification ${notification.notification_id}`);

    try {
      this.logger.debug(`Step 1: Fetching user ${notification.user_id}`);
      const user = await this.fetchUserDetails(notification.user_id);
      if (!user || !user.email) {
        throw new Error(`User ${notification.user_id} not found or has no email`);
      }
      this.logger.debug(`✓ User found: ${user.email}`);

      this.logger.debug(`Step 2: Rendering template ${notification.template_code}`);
      const renderedTemplate = await this.renderTemplate(
        notification.template_code,
        notification.variables,
      );
      this.logger.debug(`✓ Template rendered: ${renderedTemplate.subject}`);

      const emailDto: SendEmailDto = {
        to: user.email,
        subject: renderedTemplate.subject,
        html: renderedTemplate.content,
        notificationId: notification.notification_id,
        userId: notification.user_id,
        priority: this.mapPriority(notification.priority),
      };

      this.logger.debug(`Step 3: Sending email to ${user.email}`);
      const result = await this.sendEmail(emailDto);

      if (result.status === 'sent') {
        this.logger.log(`Successfully sent email for notification ${notification.notification_id}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Failed to process notification ${notification.notification_id}:`,
        error.message,
      );

      // Update notification status to FAILED
      if (notification.notification_id) {
        try {
          await this.updateNotificationStatus(
            notification.notification_id,
            NotificationStatus.FAILED,
            error.message,
          );
        } catch (dbError) {
          this.logger.error(`Failed to update notification status in DB:`, dbError.message);
        }
      }

      return {
        notificationId: notification.notification_id,
        status: 'failed',
        error: error.message,
      };
    }
  }

  // Fetch user details from user-service
  private async fetchUserDetails(userId: string): Promise<any> {
    try {
      this.logger.debug(`Fetching user details for ${userId}`);

      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/api/v1/users/${userId}`),
      );

      return response.data.data || response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}:`, error.message);
      throw new Error(`Failed to fetch user details: ${error.message}`);
    }
  }

  // Render template from template-service
  private async renderTemplate(
    templateCode: string,
    variables: Record<string, any>,
  ): Promise<{ subject: string; content: string }> {
    try {
      this.logger.debug(`Rendering template ${templateCode}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.templateServiceUrl}/api/v1/templates/render/${templateCode}`,
          variables,
        ),
      );

      return response.data.data || response.data;
    } catch (error) {
      this.logger.error(`Failed to render template ${templateCode}:`, error.message);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  // Update notification status in database
  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date(),
      };

      if (status === NotificationStatus.DELIVERED) {
        updateData.delivered_at = new Date();
      } else if (status === NotificationStatus.FAILED) {
        updateData.failed_at = new Date();
        updateData.error_message = errorMessage;
      }

      await this.databaseService.notification.update({
        where: { id: notificationId },
        data: updateData,
      });

      // Log the status change
      await this.databaseService.notificationLog.create({
        data: {
          notification_id: notificationId,
          event: `status_changed_to_${status}`,
          details: errorMessage ? { error: errorMessage } : {},
        },
      });

      this.logger.debug(`Updated notification ${notificationId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update notification ${notificationId} status:`, error.message);
    }
  }

  // Map priority number to email priority enum
  private mapPriority(priority: number): EmailPriority {
    if (priority >= 8) return EmailPriority.HIGH;
    if (priority >= 5) return EmailPriority.NORMAL;
    return EmailPriority.LOW;
  }

  async sendTemplateEmail(emailDto: SendEmailDto): Promise<EmailStatusDto> {
    try {
      if (!emailDto.template) {
        throw new Error('Template name is required for template emails');
      }

      const result = await this.mailerService.sendMail({
        to: emailDto.to,
        subject: emailDto.subject,
        template: emailDto.template,
        context: {
          ...emailDto.templateData,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Template email sent to ${emailDto.to}`);

      return {
        notificationId: emailDto.notificationId || 'unknown',
        status: 'sent',
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send template email:`, error.message);
      return {
        notificationId: emailDto.notificationId || 'unknown',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async sendBulkEmails(emails: SendEmailDto[]): Promise<EmailStatusDto[]> {
    this.logger.log(`Sending bulk emails: ${emails.length} recipients`);

    const results = await Promise.allSettled(emails.map((email) => this.sendEmail(email)));

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          notificationId: emails[index].notificationId || 'unknown',
          status: 'failed',
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  private buildMailOptions(emailDto: SendEmailDto) {
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Notification System');
    const fromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS', 'noreply@example.com');

    const priority = emailDto.priority || 'normal';

    return {
      from: emailDto.from || `"${fromName}" <${fromAddress}>`,
      to: emailDto.to,
      subject: emailDto.subject,
      text: emailDto.text,
      html: emailDto.html,
      attachments: emailDto.attachments,
      priority: priority as 'high' | 'normal' | 'low',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getHealthStatus(): Promise<{
    status: string;
    smtp: boolean;
    timestamp: Date;
  }> {
    try {
      await this.transporter.verify();
      return {
        status: 'healthy',
        smtp: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        smtp: false,
        timestamp: new Date(),
      };
    }
  }
}
