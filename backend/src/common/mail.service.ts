import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

export type MailProvider = 'resend' | 'smtp';

export interface MailDeliveryStatus {
  provider: MailProvider | 'none';
  from: string;
  configured: boolean;
  sandboxMode: boolean;
  canSendToAnyRecipient: boolean;
  help?: string;
}

@Injectable()
export class MailService {
  private resend: Resend | null = null;
  private smtp: Transporter | null = null;
  private from: string;
  private provider: MailProvider;
  private logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    const rawProvider = (config.get<string>('MAIL_PROVIDER') ?? 'resend').toLowerCase();
    this.provider = rawProvider === 'smtp' ? 'smtp' : 'resend';
    this.from = config.get<string>('MAIL_FROM_ADDRESS') ?? 'notificaciones@tudominio.com';

    if (this.provider === 'smtp') {
      const host = config.get<string>('SMTP_HOST');
      const port = Number(config.get<string>('SMTP_PORT') ?? 587);
      const user = config.get<string>('SMTP_USER');
      const pass = config.get<string>('SMTP_PASS');
      if (host && user && pass) {
        this.smtp = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      } else {
        this.logger.warn('MAIL_PROVIDER=smtp pero faltan SMTP_HOST, SMTP_USER o SMTP_PASS');
      }
    } else {
      const apiKey = config.get<string>('RESEND_API_KEY');
      if (apiKey && !apiKey.startsWith('re_xxxx')) {
        this.resend = new Resend(apiKey);
      }
    }

    const status = this.getDeliveryStatus();
    if (status.sandboxMode) {
      this.logger.warn(
        'Correo en modo prueba Resend (onboarding@resend.dev): solo llega al email de tu cuenta Resend. ' +
          'Usa dominio verificado en Resend o MAIL_PROVIDER=smtp en .env',
      );
    }
  }

  getDeliveryStatus(): MailDeliveryStatus {
    if (this.provider === 'smtp') {
      const configured = Boolean(this.smtp);
      return {
        provider: configured ? 'smtp' : 'none',
        from: this.from,
        configured,
        sandboxMode: false,
        canSendToAnyRecipient: configured,
        help: configured
          ? undefined
          : 'Configura SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS (ej. contraseña de aplicación de Gmail).',
      };
    }

    const configured = Boolean(this.resend);
    const sandboxMode = configured && this.isResendSandboxFrom(this.from);
    return {
      provider: configured ? 'resend' : 'none',
      from: this.from,
      configured,
      sandboxMode,
      canSendToAnyRecipient: configured && !sandboxMode,
      help: sandboxMode
        ? 'Con onboarding@resend.dev solo puedes enviar a tu email de cuenta Resend. Verifica un dominio en https://resend.com/domains y cambia MAIL_FROM_ADDRESS, o usa MAIL_PROVIDER=smtp.'
        : configured
          ? undefined
          : 'Define RESEND_API_KEY o cambia a MAIL_PROVIDER=smtp.',
    };
  }

  isResendSandboxFrom(from: string): boolean {
    const email = this.parseFromEmail(from);
    return email.endsWith('@resend.dev');
  }

  private parseFromEmail(from: string): string {
    const match = from.match(/<([^>]+)>/);
    return (match?.[1] ?? from).trim().toLowerCase();
  }

  async send(to: string, subject: string, html: string) {
    if (this.provider === 'smtp') {
      return this.sendSmtp(to, subject, html);
    }
    return this.sendResend(to, subject, html);
  }

  private async sendResend(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn(`Resend no configurado. Simulando envío a ${to}`);
      return { id: 'simulated', simulated: true, provider: 'resend' as const };
    }
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
    if (error) {
      this.logger.error(`Resend rechazó envío a ${to}: ${error.message}`);
      throw new Error(error.message);
    }
    this.logger.log(`Correo enviado a ${to} (Resend id: ${data?.id ?? 'n/a'})`);
    return { ...data, provider: 'resend' as const };
  }

  private async sendSmtp(to: string, subject: string, html: string) {
    if (!this.smtp) {
      throw new Error(
        'SMTP no configurado. Revisa SMTP_HOST, SMTP_USER y SMTP_PASS en backend/.env',
      );
    }
    const info = await this.smtp.sendMail({
      from: this.from,
      to,
      subject,
      html,
    });
    this.logger.log(`Correo enviado a ${to} (SMTP messageId: ${info.messageId})`);
    return { id: info.messageId, provider: 'smtp' as const };
  }
}
