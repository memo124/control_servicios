import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('system')
export class SystemController {
  constructor(private service: SystemService) {}

  @Get('version')
  version() {
    return this.service.getVersion();
  }

  @Get('changelog')
  @UseGuards(JwtAuthGuard)
  changelog() {
    return this.service.getChangelog();
  }

  @Post('changelog')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios.gestionar')
  addVersion(@Body() body: { version: string; titulo: string; descripcion?: string; tipo?: string }) {
    return this.service.addVersion(body);
  }
}
