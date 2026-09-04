import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificacionesService, EmailJobData } from './notificaciones.service';

@Injectable()
export class NotificationsCronService {
  private logger = new Logger(NotificationsCronService.name);

  constructor(
    private notificaciones: NotificacionesService,
    @InjectQueue('email-notifications') private emailQueue: Queue<EmailJobData>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyNotifications() {
    this.logger.log('Iniciando job diario de notificaciones');
    await this.notificaciones.enqueueDailyNotifications(async (data) => {
      await this.emailQueue.add('send-email', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    });
  }

  async runManually() {
    return this.notificaciones.enqueueDailyNotifications(async (data) => {
      await this.emailQueue.add('send-email', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    });
  }
}
