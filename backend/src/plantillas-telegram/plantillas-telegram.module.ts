import { Module } from '@nestjs/common';
import { PlantillasTelegramService } from './plantillas-telegram.service';
import { PlantillasTelegramController } from './plantillas-telegram.controller';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [PlantillasTelegramController],
  providers: [PlantillasTelegramService],
  exports: [PlantillasTelegramService],
})
export class PlantillasTelegramModule {}
