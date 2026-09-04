import { Controller, Get, UseGuards } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('finanzas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanzasController {
  constructor(private service: FinanzasService) {}

  @Get('balance')
  @Permissions('finanzas.ver')
  balance() {
    return this.service.getBalance();
  }

  @Get('resumen')
  @Permissions('finanzas.ver')
  resumen() {
    return this.service.getResumen();
  }

  @Get('por-plataforma')
  @Permissions('finanzas.ver')
  porPlataforma() {
    return this.service.getPorPlataforma();
  }
}
