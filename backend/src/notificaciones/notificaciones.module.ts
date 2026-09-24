import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { EmailProcessor } from './email.processor';
import { NotificationsCronService } from './notifications-cron.service';
import { TelegramDuenoNotifierService } from './telegram-dueno-notifier.service';
import { PlantillasModule } from '../plantillas/plantillas.module';
import { PlantillasTelegramModule } from '../plantillas-telegram/plantillas-telegram.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PaymentInfoService } from '../common/payment-info.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email-notifications' }),
    PlantillasModule,
    PlantillasTelegramModule,
    TelegramModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    EmailProcessor,
    NotificationsCronService,
    TelegramDuenoNotifierService,
    PaymentInfoService,
  ],
  exports: [NotificacionesService, TelegramDuenoNotifierService],
})
export class NotificacionesModule {}
