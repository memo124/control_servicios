import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuscripcionesService } from './suscripciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('suscripciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuscripcionesController {
  constructor(private service: SuscripcionesService) {}

  @Get()
  @Permissions('suscripciones.ver')
  findAll(
    @Query('plataforma') plataforma?: string,
    @Query('estado') estado?: string,
    @Query('dueno') dueno?: string,
    @Query('activo') activo?: string,
  ) {
    return this.service.findAll({
      plataforma,
      estado,
      dueno,
      activo: activo === undefined ? undefined : activo === 'true',
    });
  }

  @Get(':id')
  @Permissions('suscripciones.ver')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('suscripciones.crear')
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body as Parameters<SuscripcionesService['create']>[0]);
  }

  @Patch(':id')
  @Permissions('suscripciones.editar')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body as Parameters<SuscripcionesService['update']>[1]);
  }

  @Delete(':id')
  @Permissions('suscripciones.eliminar')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
