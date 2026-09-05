import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

@Injectable()
export class AlertasDuenoService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  async getStatus(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    const chatId = user.alertasDuenoTelegramChatId ?? user.telegramChatId;
    return {
      alertasDuenoTelegramActivo: user.alertasDuenoTelegramActivo,
      telefono: user.telefono,
      alertasDuenoTelegramChatId: user.alertasDuenoTelegramChatId,
      chatIdResuelto: chatId,
      telegramConfigured: this.telegram.isConfigured(),
    };
  }

  async setup(userId: number, chatId: string, telefono?: string) {
    if (!chatId?.trim()) throw new BadRequestException('Chat ID de Telegram requerido');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        alertasDuenoTelegramActivo: true,
        alertasDuenoTelegramChatId: chatId.trim(),
        telefono: telefono?.trim() || undefined,
      },
    });

    await this.telegram.sendMessage(
      chatId.trim(),
      `<b>Control Servicios</b>\n\n✅ Alertas de dueño activadas.\nRecibirás avisos por Telegram cuando tus clientes estén en <b>días de gracia</b> o <b>vencidos</b> (para que les escribas). Los clientes siguen recibiendo correo por separado.`,
    );

    return { enabled: true, message: 'Alertas de dueño activadas. Revisa Telegram.' };
  }

  async disable(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        alertasDuenoTelegramActivo: false,
        alertasDuenoTelegramChatId: null,
      },
    });
    return { enabled: false };
  }
}
