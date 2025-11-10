import { NotificationType, NotificationStatus } from '../dto/notification.dto';

export interface QueueMessage {
  notification_id: string;
  user_id: string;
  notification_type: NotificationType;
  template_code: string;
  variables: Record<string, any>;
  priority: number;
  request_id: string;
  metadata?: Record<string, any>;
  retry_count?: number;
  created_at: Date;
}

export interface NotificationResult {
  notification_id: string;
  status: NotificationStatus;
  timestamp: Date;
  error?: string;
  provider_response?: any;
}

export const QUEUE_NAMES = {
  EMAIL: 'email.queue',
  PUSH: 'push.queue',
  FAILED: 'failed.queue',
  STATUS: 'status.queue',
} as const;

export const EXCHANGE_NAMES = {
  NOTIFICATIONS: 'notifications.direct',
  DLX: 'notifications.dlx',
} as const;
