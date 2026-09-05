import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DbBackupService } from './db-backup.service';
import { PlantillasTelegramService } from '../plantillas-telegram/plantillas-telegram.service';
import { TelegramService } from '../auth/telegram.service';
import type { AuthUser } from '../auth/auth.service';

@Injectable()
export class SystemService {
  private logger = new Logger(SystemService.name);

  constructor(
    private prisma: PrismaService,
    private dbBackup: DbBackupService,
    private plantillasTelegram: PlantillasTelegramService,
    private telegram: TelegramService,
  ) {}

  getVersion() {
    return {
      app: process.env.APP_VERSION ?? '1.0.0',
      node: process.version,
    };
  }

  getChangelog() {
    return this.prisma.systemVersion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  addVersion(data: { version: string; titulo: string; descripcion?: string; tipo?: string }) {
    return this.prisma.systemVersion.create({ data });
  }

  async createBackupForDownload(user: AuthUser) {
    const backup = await this.dbBackup.generate();
    await this.notifyBackupDownload(user, backup.filename, backup.sizeBytes);

    return backup;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private async notifyBackupDownload(user: AuthUser, filename: string, sizeBytes: number) {
    const chatId = this.telegram.getGroupChatId();
    if (!chatId) {
      this.logger.warn('Backup descargado sin notificación: TELEGRAM_GROUP_CHAT_ID no configurado');
      return { notified: false, reason: 'grupo_no_configurado' };
    }

    const fecha = new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' });
    const texto = await this.plantillasTelegram.render('TELEGRAM_BACKUP_BD', {
      usuario: user.name,
      email: user.email,
      fecha,
      archivo: filename,
      tamano: this.formatSize(sizeBytes),
    });

    const result = await this.telegram.sendMessage(chatId, texto);
    if (!result.ok) {
      this.logger.warn(`No se pudo notificar backup por Telegram: ${result.error}`);
    }
    return { notified: result.ok, simulated: result.simulated, error: result.error };
  }
}
