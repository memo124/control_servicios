import { Module } from '@nestjs/common';
import { TelegramService } from '../auth/telegram.service';

@Module({
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
