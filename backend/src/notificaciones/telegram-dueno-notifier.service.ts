import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../auth/telegram.service';
import { PlantillasTelegramService } from '../plantillas-telegram/plantillas-telegram.service';
import type { SuscripcionDetalle } from '../suscripciones/suscripciones.service';

export interface DuenoTelegramPendiente {
  duenoNombre: string;
  userId: number;
  telefono: string | null;
  venceHoy: number;
  enGracia: number;
  vencidas: number;
  total: number;
}

@Injectable()
export class TelegramDuenoNotifierService {
  private logger = new Logger(TelegramDuenoNotifierService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private plantillas: PlantillasTelegramService,
  ) {}

  private formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }

  async getSuscripcionesParaDuenos(): Promise<SuscripcionDetalle[]> {
    return this.prisma.$queryRaw<SuscripcionDetalle[]>`
      SELECT * FROM v_suscripciones_detalle
      WHERE activo = TRUE
        AND estado_codigo IN ('VENCE_HOY', 'EN_GRACIA', 'VENCIDA')
      ORDER BY dueno_cuenta, estado_codigo, cliente_nombre
    `;
  }

  async getPendientesTelegramDuenos(): Promise<DuenoTelegramPendiente[]> {
    if (!this.telegram.hasGroupChat()) return [];

    const rows = await this.getSuscripcionesParaDuenos();
    const byDueno = new Map<string, SuscripcionDetalle[]>();
    for (const r of rows) {
      const list = byDueno.get(r.dueno_cuenta) ?? [];
      list.push(r);
      byDueno.set(r.dueno_cuenta, list);
    }

    const operadores = await this.prisma.user.findMany({
      where: { alertasDuenoTelegramActivo: true, status: 'active' },
    });

    const pendientes: DuenoTelegramPendiente[] = [];

    for (const user of operadores) {
      const subs = byDueno.get(user.name) ?? [];
      if (subs.length === 0) continue;

      pendientes.push({
        duenoNombre: user.name,
        userId: user.id,
        telefono: user.telefono,
        venceHoy: subs.filter((s) => s.estado_codigo === 'VENCE_HOY').length,
        enGracia: subs.filter((s) => s.estado_codigo === 'EN_GRACIA').length,
        vencidas: subs.filter((s) => s.estado_codigo === 'VENCIDA').length,
        total: subs.length,
      });
    }

    return pendientes;
  }

  async buildMessage(duenoNombre: string, subs: SuscripcionDetalle[]): Promise<string> {
    const venceHoy = subs.filter((s) => s.estado_codigo === 'VENCE_HOY');
    const enGracia = subs.filter((s) => s.estado_codigo === 'EN_GRACIA');
    const vencidas = subs.filter((s) => s.estado_codigo === 'VENCIDA');

    const lines: string[] = [
      await this.plantillas.render('TELEGRAM_ALERTAS_HEADER', { dueno_nombre: duenoNombre }),
    ];

    const section = (title: string, items: SuscripcionDetalle[], emoji: string) => {
      if (items.length === 0) return;
      lines.push(`${emoji} <b>${title}</b> (${items.length})`);
      for (const s of items) {
        const gracia =
          s.estado_codigo === 'EN_GRACIA'
            ? ` · gracia ${s.dias_gracia_restantes}d restantes`
            : '';
        lines.push(
          `• <b>${s.cliente_nombre}</b> — ${s.plataforma} (${s.cuenta_identificador})`,
        );
        lines.push(
          `  Corte: ${this.formatDate(s.fecha_corte)} · $${s.precio_cobro}${gracia}`,
        );
      }
      lines.push('');
    };

    section('Vence hoy', venceHoy, '⏰');
    section('En días de gracia', enGracia, '⚠️');
    section('Vencidas / cortadas', vencidas, '❌');

    lines.push(await this.plantillas.render('TELEGRAM_ALERTAS_FOOTER'));
    return lines.join('\n');
  }

  async enviarAlertasDuenos(): Promise<{ enviados: number; omitidos: number; errores: number }> {
    const groupChatId = this.telegram.getGroupChatId();
    if (!groupChatId) {
      this.logger.warn('TELEGRAM_GROUP_CHAT_ID no configurado — omitiendo alertas Telegram');
      return { enviados: 0, omitidos: 0, errores: 0 };
    }

    const rows = await this.getSuscripcionesParaDuenos();
    const byDueno = new Map<string, SuscripcionDetalle[]>();
    for (const r of rows) {
      const list = byDueno.get(r.dueno_cuenta) ?? [];
      list.push(r);
      byDueno.set(r.dueno_cuenta, list);
    }

    const operadores = await this.prisma.user.findMany({
      where: { alertasDuenoTelegramActivo: true, status: 'active' },
    });

    let enviados = 0;
    let omitidos = 0;
    let errores = 0;

    for (const user of operadores) {
      const subs = byDueno.get(user.name);
      if (!subs?.length) {
        omitidos++;
        continue;
      }

      const texto = await this.buildMessage(user.name, subs);
      const sendResult = await this.telegram.sendMessage(groupChatId, texto);
      const ok = sendResult.ok;
      const estadoEnvio = ok ? 'enviado' : 'error';

      await this.prisma.historialNotificacionDueno.create({
        data: {
          userId: user.id,
          duenoNombre: user.name,
          telefono: user.telefono,
          telegramChatId: groupChatId,
          suscripcionesCount: subs.length,
          estadoEnvio,
          mensajeResumen: `${subs.length} suscripción(es): ${subs.map((s) => s.cliente_nombre).join(', ').slice(0, 200)}`,
        },
      });

      if (ok) {
        enviados++;
        this.logger.log(`Telegram grupo — dueño ${user.name}: ${subs.length} alerta(s)`);
      } else {
        errores++;
      }
    }

    return { enviados, omitidos, errores };
  }

  getHistorialDueno(limit = 50) {
    return this.prisma.historialNotificacionDueno.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
  }
}
