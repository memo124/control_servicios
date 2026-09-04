import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PlataformasService } from './plataformas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('plataformas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlataformasController {
  constructor(private service: PlataformasService) {}

  @Get()
  @Permissions('cuentas.gestionar', 'finanzas.ver', 'suscripciones.ver')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions('cuentas.gestionar')
  create(@Body() body: { nombre: string; descripcion?: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Permissions('cuentas.gestionar')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body);
  }
}
