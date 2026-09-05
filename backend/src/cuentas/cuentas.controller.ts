import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CuentasService } from './cuentas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { operadorDuenoScope } from '../common/utils/operador-scope.util';

@Controller('cuentas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CuentasController {
  constructor(private service: CuentasService) {}

  @Get()
  @Permissions('cuentas.gestionar', 'finanzas.ver')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('plataformaId') plataformaId?: string,
  ) {
    return this.service.findAll(
      plataformaId ? parseInt(plataformaId, 10) : undefined,
      operadorDuenoScope(user),
    );
  }

  @Get(':id')
  @Permissions('cuentas.gestionar')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('cuentas.gestionar')
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body as Parameters<CuentasService['create']>[0]);
  }

  @Patch(':id')
  @Permissions('cuentas.gestionar')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Permissions('cuentas.gestionar')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
