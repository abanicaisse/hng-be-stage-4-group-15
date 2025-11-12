// apps/email-service/src/email-service.types.ts
export interface Email {
  id: number;
  to: string;
  subject: string;
  body: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  createdAt: string;
  sentAt?: string;        // optional, set when email is sent
  failedAt?: string;      // optional, in case sending fails
  errorMessage?: string;  // optional, if sending fails
}
