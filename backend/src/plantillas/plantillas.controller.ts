import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PlantillasService } from './plantillas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('plantillas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlantillasController {
  constructor(private service: PlantillasService) {}

  @Get()
  @Permissions('plantillas.editar', 'correos.enviar')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('plantillas.editar')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions('plantillas.editar')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body as Parameters<PlantillasService['update']>[1]);
  }

  @Post(':id/preview')
  @Permissions('plantillas.editar')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() variables: Record<string, string>,
  ) {
    return this.service.preview(id, variables);
  }
}
