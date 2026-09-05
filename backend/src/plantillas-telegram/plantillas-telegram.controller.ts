import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PlantillasTelegramService } from './plantillas-telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('plantillas-telegram')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlantillasTelegramController {
  constructor(private service: PlantillasTelegramService) {}

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
    return this.service.update(id, body as Parameters<PlantillasTelegramService['update']>[1]);
  }

  @Post(':id/preview')
  @Permissions('plantillas.editar')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() variables: Record<string, string>,
  ) {
    return this.service.preview(id, variables);
  }

  @Post(':id/enviar-prueba')
  @Permissions('plantillas.editar', 'correos.enviar')
  enviarPrueba(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() body: { variables?: Record<string, string> },
  ) {
    return this.service.sendTest(user.id, id, body.variables ?? {});
  }
}
