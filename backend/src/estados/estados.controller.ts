import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { EstadosService } from './estados.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('estados')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EstadosController {
  constructor(private service: EstadosService) {}

  @Get()
  @Permissions('suscripciones.ver')
  findAll() {
    return this.service.findAll();
  }

  @Patch('reglas/:id')
  @Permissions('usuarios.gestionar')
  updateRegla(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.updateRegla(id, body);
  }
}
