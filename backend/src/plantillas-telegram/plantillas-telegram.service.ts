import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { replaceTemplateVars } from '../common/utils/template-vars.util';
import { TelegramService } from '../auth/telegram.service';

const FALLBACKS: Record<string, string> = {
  TELEGRAM_2FA_CODE:
    '<b>Control Servicios — 2FA</b>\n<b>Usuario:</b> {{usuario}}\n\nCódigo:\n<code>{{code}}</code>\n\nExpira en 5 minutos.',
  TELEGRAM_ALERTAS_SETUP:
    '<b>Control Servicios</b>\n\n✅ Alertas activadas para <b>{{usuario}}</b>.\nLos avisos de clientes en gracia/vencidos se publican en este grupo.',
  TELEGRAM_TEST:
    '<b>Control Servicios</b>\n\n✅ Mensaje de prueba.\nSi ves esto, Telegram está configurado correctamente.',
  TELEGRAM_TEST_GRUPO:
    '<b>Control Servicios</b>\n\n✅ Mensaje de prueba al <b>grupo</b>.\nEnviado por: {{usuario}}\nSi ves esto, el bot puede publicar en el chat grupal.',
  TELEGRAM_ALERTAS_HEADER:
    '<b>🔔 Control Servicios</b>\n<b>Dueño:</b> {{dueno_nombre}}\n\nClientes que requieren que les escribas (el correo ya avisa al cliente):\n',
  TELEGRAM_ALERTAS_FOOTER:
    '<i>Responde a tus clientes por WhatsApp o teléfono.</i>',
};

@Injectable()
export class PlantillasTelegramService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  findAll() {
    return this.prisma.plantillaTelegram.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.plantillaTelegram.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.plantillaTelegram.findUnique({ where: { codigo } });
  }

  update(id: number, data: { titulo?: string; cuerpoTexto?: string; activo?: boolean }) {
    return this.prisma.plantillaTelegram.update({ where: { id }, data });
  }

  preview(id: number, variables: Record<string, string>) {
    return this.findOne(id).then((tpl) => {
      if (!tpl) return null;
      return { texto: replaceTemplateVars(tpl.cuerpoTexto, variables) };
    });
  }

  async render(codigo: string, variables: Record<string, string> = {}): Promise<string> {
    const tpl = await this.findByCodigo(codigo);
    const body = tpl?.activo ? tpl.cuerpoTexto : (FALLBACKS[codigo] ?? '');
    if (!body) throw new NotFoundException(`Plantilla Telegram ${codigo} no encontrada`);
    return replaceTemplateVars(body, variables);
  }

  private requireGroupChatId(): string {
    const chatId = this.telegram.getGroupChatId();
    if (!chatId) {
      throw new BadRequestException(
        'TELEGRAM_GROUP_CHAT_ID no configurado en backend/.env',
      );
    }
    return chatId;
  }

  async sendTest(userId: number, plantillaId: number, variables: Record<string, string> = {}) {
    const tpl = await this.findOne(plantillaId);
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const resolvedChatId = this.requireGroupChatId();
    const vars = { usuario: user?.name ?? 'Operador', ...variables };
    const texto = replaceTemplateVars(tpl.cuerpoTexto, vars);
    const result = await this.telegram.sendMessage(resolvedChatId, texto);
    return {
      ...result,
      chatId: resolvedChatId,
      plantilla: tpl.codigo,
      destino: 'grupo',
    };
  }

  async sendByCodigo(codigo: string, chatId: string, variables: Record<string, string> = {}) {
    const texto = await this.render(codigo, variables);
    const result = await this.telegram.sendMessage(chatId, texto);
    return { ...result, chatId, codigo };
  }
}
