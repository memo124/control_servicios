import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    return !!token && !token.startsWith('xxxx');
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token || token.startsWith('xxxx')) {
      this.logger.warn('Telegram no configurado. Mensaje simulado.');
      this.logger.debug(`[Telegram sim] ${chatId}: ${text}`);
      return false;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      return res.ok;
    } catch (err) {
      this.logger.error(`Error Telegram: ${err}`);
      return false;
    }
  }

  async sendCode(chatId: string, code: string): Promise<boolean> {
    return this.sendMessage(
      chatId,
      `<b>Control Servicios</b>\n\nTu código de verificación es:\n<code>${code}</code>\n\nExpira en 5 minutos.`,
    );
  }
}
