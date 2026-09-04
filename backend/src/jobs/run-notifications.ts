import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationsCronService } from '../notificaciones/notifications-cron.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cron = app.get(NotificationsCronService);
  const result = await cron.runManually();
  console.log('Notificaciones ejecutadas:', result);
  await app.close();
}

main().catch(console.error);
