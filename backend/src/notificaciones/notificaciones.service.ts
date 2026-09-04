import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlantillasService } from '../plantillas/plantillas.service';
import type { SuscripcionDetalle } from '../suscripciones/suscripciones.service';

export interface EmailJobData {
  suscripcionId: number;
  email: string;
  asunto: string;
  html: string;
}

@Injectable()
export class MailService {
  private resend: Resend | null = null;
  private from: string;
  private logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('MAIL_FROM_ADDRESS') ?? 'notificaciones@tudominio.com';
    if (apiKey && !apiKey.startsWith('re_xxxx')) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn(`Resend no configurado. Simulando envío a ${to}`);
      return { id: 'simulated', simulated: true };
    }
    return this.resend.emails.send({ from: this.from, to, subject, html });
  }
}

@Injectable()
export class NotificacionesService {
  private logger = new Logger(NotificacionesService.name);

  constructor(
    private prisma: PrismaService,
    private plantillas: PlantillasService,
    private mail: MailService,
  ) {}

  private formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }

  buildVariables(sub: SuscripcionDetalle): Record<string, string> {
    return {
      cliente_nombre: sub.cliente_nombre,
      plataforma: sub.plataforma,
      perfil_nombre: sub.perfil_nombre ?? '',
      precio_cobro: String(sub.precio_cobro),
      fecha_corte: this.formatDate(sub.fecha_corte),
      dias_gracia: String(sub.dias_gracia),
      fecha_limite_gracia: this.formatDate(sub.fecha_limite_gracia),
      estado_nombre: sub.estado_nombre,
      color_hex: sub.color_hex,
    };
  }

  replaceVars(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      result = result.split(`{{${key}}}`).join(val);
    }
    return result;
  }

  isValidEmail(email: string | null): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async getPendingNotifications() {
    const rows = await this.prisma.$queryRaw<SuscripcionDetalle[]>`
      SELECT * FROM v_suscripciones_detalle
      WHERE activo = TRUE
        AND estado_codigo IN ('VENCE_HOY', 'EN_GRACIA', 'VENCIDA')
        AND desea_notificaciones_correo = TRUE
    `;
    return rows.filter((r) => this.isValidEmail(r.cliente_email));
  }

  async processEmailJob(data: EmailJobData) {
    let estadoEnvio = 'enviado';
    let respuesta: unknown;
    try {
      respuesta = await this.mail.send(data.email, data.asunto, data.html);
    } catch (err) {
      estadoEnvio = 'error';
      respuesta = { error: String(err) };
      this.logger.error(`Error enviando a ${data.email}: ${err}`);
    }
    await this.prisma.historialNotificacion.create({
      data: {
        suscripcionId: data.suscripcionId,
        email: data.email,
        estadoEnvio,
        respuestaResend: respuesta as object,
      },
    });
    return { estadoEnvio, respuesta };
  }

  async enqueueDailyNotifications(addToQueue: (data: EmailJobData) => Promise<void>) {
    const plantilla = await this.plantillas.findByCodigo('AVISO_PAGO_SUSCRIPCION');
    if (!plantilla?.activo) {
      this.logger.warn('Plantilla AVISO_PAGO_SUSCRIPCION no activa');
      return { enqueued: 0 };
    }

    const pending = await this.getPendingNotifications();
    let enqueued = 0;

    for (const sub of pending) {
      const vars = this.buildVariables(sub);
      const asunto = this.replaceVars(plantilla.asunto, vars);
      const html = this.replaceVars(plantilla.cuerpoHtml, vars);
      await addToQueue({
        suscripcionId: sub.suscripcion_id,
        email: sub.cliente_email!,
        asunto,
        html,
      });
      enqueued++;
    }

    this.logger.log(`Encolados ${enqueued} correos de notificación`);
    return { enqueued };
  }

  getHistorial(limit = 100) {
    return this.prisma.historialNotificacion.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        suscripcion: {
          include: {
            cliente: true,
            cuenta: { include: { plataforma: true } },
          },
        },
      },
    });
  }
}
