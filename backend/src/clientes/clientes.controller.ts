import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('clientes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientesController {
  constructor(private service: ClientesService) {}

  @Get()
  @Permissions('clientes.gestionar', 'suscripciones.ver')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('clientes.gestionar', 'suscripciones.ver')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('clientes.gestionar')
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body as Parameters<ClientesService['create']>[0]);
  }

  @Patch(':id')
  @Permissions('clientes.gestionar')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Permissions('clientes.gestionar')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
