import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TelegramSendResult {
  ok: boolean;
  simulated: boolean;
  error?: string;
}

@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    return !!token && !token.startsWith('xxxx');
  }

  /** Mensajes claros para errores frecuentes de Telegram API */
  private friendlyError(description: string): string {
    const d = description.toLowerCase();
    if (d.includes("can't send messages to the bot")) {
      return 'Ese Chat ID es del bot, no el tuyo. Usa @userinfobot para obtener TU número (ej. 123456789), no el token ni el nombre del bot.';
    }
    if (d.includes('bot was blocked by the user')) {
      return 'Bloqueaste el bot en Telegram. Desbloquéalo y envíale /start de nuevo.';
    }
    if (d.includes('chat not found')) {
      return 'Chat ID no válido. Abre @userinfobot en Telegram, copia tu Id y envía /start a tu bot antes de probar.';
    }
    if (d.includes("bot can't initiate conversation") || d.includes('have no rights to send')) {
      return 'Primero abre tu bot en Telegram y envíale /start; luego vuelve a probar.';
    }
    if (d.includes('not a member of') || d.includes('bot is not a member')) {
      return 'El bot no está en ese grupo. Agrégalo al grupo (como miembro o admin) y vuelve a probar.';
    }
    if (d.includes('chat_write_forbidden') || d.includes('not enough rights to send')) {
      return 'El bot no puede escribir en el grupo. Hazlo administrador o permite que envíe mensajes.';
    }
    return description;
  }

  getGroupChatId(): string | null {
    const id = this.config.get<string>('TELEGRAM_GROUP_CHAT_ID')?.trim();
    return id || null;
  }

  hasGroupChat(): boolean {
    return !!this.getGroupChatId();
  }

  async sendMessage(chatId: string, text: string): Promise<TelegramSendResult> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token || token.startsWith('xxxx')) {
      this.logger.warn('Telegram no configurado. Mensaje simulado.');
      this.logger.debug(`[Telegram sim] ${chatId}: ${text}`);
      return { ok: false, simulated: true, error: 'TELEGRAM_BOT_TOKEN no configurado en el servidor' };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      const json = (await res.json()) as { ok?: boolean; description?: string };
      if (!res.ok || !json.ok) {
        const raw = json.description ?? `HTTP ${res.status}`;
        const error = this.friendlyError(raw);
        this.logger.error(`Error Telegram: ${raw}`);
        return { ok: false, simulated: false, error };
      }
      return { ok: true, simulated: false };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error Telegram: ${error}`);
      return { ok: false, simulated: false, error };
    }
  }
}
