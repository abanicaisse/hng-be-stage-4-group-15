import { IsEmail, IsNotEmpty, IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  VERIFICATION = 'verification',
  NOTIFICATION = 'notification',
  ALERT = 'alert',
}

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsEnum(EmailTemplate)
  @IsOptional()
  template?: EmailTemplate;

  @IsObject()
  @IsOptional()
  templateData?: Record<string, any>;

  @IsEnum(EmailPriority)
  @IsOptional()
  priority?: EmailPriority;

  @IsString()
  @IsOptional()
  from?: string;

  @IsOptional()
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
  }>;

  @IsString()
  @IsOptional()
  notificationId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class EmailStatusDto {
  notificationId: string;
  status: 'sent' | 'failed' | 'queued';
  sentAt?: Date;
  error?: string;
  retryCount?: number;
}
