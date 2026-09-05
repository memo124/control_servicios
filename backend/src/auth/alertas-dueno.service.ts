import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { PlantillasTelegramService } from '../plantillas-telegram/plantillas-telegram.service';

@Injectable()
export class AlertasDuenoService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private plantillas: PlantillasTelegramService,
  ) {}

  private requireGroupChatId(): string {
    const chatId = this.telegram.getGroupChatId();
    if (!chatId) {
      throw new BadRequestException(
        'Telegram no configurado: define TELEGRAM_BOT_TOKEN y TELEGRAM_GROUP_CHAT_ID en backend/.env',
      );
    }
    return chatId;
  }

  async getStatus(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    return {
      alertasDuenoTelegramActivo: user.alertasDuenoTelegramActivo,
      telefono: user.telefono,
      telegramConfigured: this.telegram.isConfigured(),
      groupChatConfigured: this.telegram.hasGroupChat(),
    };
  }

  async setup(userId: number, telefono?: string) {
    const groupChatId = this.requireGroupChatId();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        alertasDuenoTelegramActivo: true,
        telefono: telefono?.trim() || undefined,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const texto = await this.plantillas.render('TELEGRAM_ALERTAS_SETUP', {
      usuario: user?.name ?? 'Operador',
    });
    await this.telegram.sendMessage(groupChatId, texto);

    return { enabled: true, message: 'Alertas activadas. Los avisos se publican en el grupo de Telegram.' };
  }

  async sendTest(userId: number) {
    return this.sendTestToGroup(userId);
  }

  async sendTestToGroup(userId: number) {
    const groupChatId = this.requireGroupChatId();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const result = await this.plantillas.sendByCodigo('TELEGRAM_TEST_GRUPO', groupChatId, {
      usuario: user?.name ?? 'Operador',
    });
    if (result.simulated) {
      return {
        ok: false,
        simulated: true,
        message: 'Bot no configurado. Revisa TELEGRAM_BOT_TOKEN en backend/.env',
        destino: 'grupo',
      };
    }
    if (!result.ok) {
      throw new BadRequestException(result.error ?? 'No se pudo enviar al grupo');
    }
    return {
      ok: true,
      simulated: false,
      message: 'Mensaje enviado al grupo de Telegram.',
      destino: 'grupo',
    };
  }

  async disable(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { alertasDuenoTelegramActivo: false },
    });
    return { enabled: false };
  }
}
