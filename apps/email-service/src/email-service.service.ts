import { Injectable } from '@nestjs/common';
import { Email } from './email-service.types';

@Injectable()
export class EmailServiceService {
  private emailsQueue: Email[] = [];

  sendEmail(dto: { to: string; subject?: string; body?: string }) {
    const email: Email = {
      id: Date.now(),
      to: dto.to,
      subject: dto.subject || 'No subject',
      body: dto.body || '',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    this.emailsQueue.push(email);

    setTimeout(() => {
      email.status = 'SENT';
      email.sentAt = new Date().toISOString();
      console.log('Email sent:', email.to, email.subject);
    }, 1000);

    return { success: true, message: 'Email queued', email };
  }

  getAllEmails(): Email[] {
    return this.emailsQueue;
  }
}
