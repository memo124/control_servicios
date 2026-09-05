import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { DbBackupService } from './db-backup.service';
import { PlantillasTelegramModule } from '../plantillas-telegram/plantillas-telegram.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PlantillasTelegramModule, TelegramModule],
  controllers: [SystemController],
  providers: [SystemService, DbBackupService],
})
export class SystemModule {}
