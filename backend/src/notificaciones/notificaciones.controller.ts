import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { NotificationsCronService } from './notifications-cron.service';
import { TelegramDuenoNotifierService } from './telegram-dueno-notifier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificacionesController {
  constructor(
    private service: NotificacionesService,
    private cron: NotificationsCronService,
    private telegramDueno: TelegramDuenoNotifierService,
  ) {}

  @Get('historial')
  @Permissions('correos.enviar', 'suscripciones.ver')
  historial() {
    return this.service.getHistorial();
  }

  @Get('pendientes')
  @Permissions('correos.enviar')
  pendientes() {
    return this.service.getPendingNotifications();
  }

  @Post('ejecutar')
  @Permissions('correos.enviar')
  ejecutar() {
    return this.cron.runManually();
  }

  @Get('telegram-duenos/pendientes')
  @Permissions('correos.enviar')
  pendientesTelegramDuenos() {
    return this.telegramDueno.getPendientesTelegramDuenos();
  }

  @Get('telegram-duenos/historial')
  @Permissions('correos.enviar', 'suscripciones.ver')
  historialTelegramDuenos() {
    return this.telegramDueno.getHistorialDueno();
  }

  @Post('telegram-duenos/ejecutar')
  @Permissions('correos.enviar')
  ejecutarTelegramDuenos() {
    return this.cron.runTelegramDuenosManually();
  }
}
