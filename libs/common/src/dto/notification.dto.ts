import { IsEnum, IsUUID, IsString, IsObject, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export class UserData {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  link: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @ApiProperty()
  @IsUUID()
  user_id: string;

  @ApiProperty()
  @IsString()
  template_code: string;

  @ApiProperty({ type: () => UserData })
  @IsObject()
  variables: UserData;

  @ApiProperty()
  @IsString()
  request_id: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  priority: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateNotificationStatusDto {
  @ApiProperty()
  @IsString()
  notification_id: string;

  @ApiProperty({ enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  status: NotificationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  timestamp?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}
