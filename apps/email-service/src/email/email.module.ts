import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { QueueModule } from '@app/queue';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailConsumer } from './email.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    QueueModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const smtpHost = configService.get<string>('SMTP_HOST');
        const isMailHog = smtpHost === 'localhost' || smtpHost === '127.0.0.1';

        return {
          transport: {
            host: smtpHost,
            port: configService.get<number>('SMTP_PORT'),
            secure: false,
            requireTLS: !isMailHog,
            auth: configService.get<string>('SMTP_USER')
              ? {
                  user: configService.get<string>('SMTP_USER'),
                  pass: configService.get<string>('SMTP_PASS'),
                }
              : undefined,
            tls: !isMailHog
              ? {
                  ciphers: 'SSLv3',
                  rejectUnauthorized: false,
                }
              : undefined,
          },
          defaults: {
            from: `"${configService.get<string>('EMAIL_FROM_NAME')}" <${configService.get<string>('EMAIL_FROM_ADDRESS')}>`,
          },
          template: {
            dir: join(__dirname, '..', 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailConsumer],
  exports: [EmailService],
})
export class EmailModule {}
