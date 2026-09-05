import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificacionesService, EmailJobData } from './notificaciones.service';
import { TelegramDuenoNotifierService } from './telegram-dueno-notifier.service';

const QUEUE_TIMEOUT_MS = 5_000;

@Injectable()
export class NotificationsCronService {
  private logger = new Logger(NotificationsCronService.name);

  constructor(
    private notificaciones: NotificacionesService,
    private telegramDueno: TelegramDuenoNotifierService,
    @InjectQueue('email-notifications') private emailQueue: Queue<EmailJobData>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyNotifications() {
    this.logger.log('Iniciando job diario de notificaciones');
    await this.enqueueNotifications();
    await this.telegramDueno.enviarAlertasDuenos();
  }

  async runManually() {
    return this.enqueueNotifications();
  }

  async runTelegramDuenosManually() {
    return this.telegramDueno.enviarAlertasDuenos();
  }

  private async enqueueNotifications() {
    try {
      return await this.notificaciones.enqueueDailyNotifications(async (data) => {
        await this.addToQueueWithTimeout(data);
      });
    } catch (err) {
      this.logger.warn(`Redis no disponible (${String(err)}). Enviando correos en línea.`);
      return this.notificaciones.enqueueDailyNotifications(async (data) => {
        await this.notificaciones.processEmailJob(data);
      });
    }
  }

  private addToQueueWithTimeout(data: EmailJobData) {
    const job = this.emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ServiceUnavailableException('Redis no responde')), QUEUE_TIMEOUT_MS);
    });
    return Promise.race([job, timeout]);
  }
}
