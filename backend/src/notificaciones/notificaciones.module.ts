import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificacionesService, MailService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { EmailProcessor } from './email.processor';
import { NotificationsCronService } from './notifications-cron.service';
import { PlantillasModule } from '../plantillas/plantillas.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email-notifications' }),
    PlantillasModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    MailService,
    EmailProcessor,
    NotificationsCronService,
  ],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
