import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { NotificationsCronService } from './notifications-cron.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificacionesController {
  constructor(
    private service: NotificacionesService,
    private cron: NotificationsCronService,
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
}
