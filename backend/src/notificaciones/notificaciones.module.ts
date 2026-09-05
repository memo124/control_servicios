import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificacionesService, MailService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { EmailProcessor } from './email.processor';
import { NotificationsCronService } from './notifications-cron.service';
import { TelegramDuenoNotifierService } from './telegram-dueno-notifier.service';
import { PlantillasModule } from '../plantillas/plantillas.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email-notifications' }),
    PlantillasModule,
    AuthModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    MailService,
    EmailProcessor,
    NotificationsCronService,
    TelegramDuenoNotifierService,
  ],
  exports: [NotificacionesService, TelegramDuenoNotifierService],
})
export class NotificacionesModule {}
