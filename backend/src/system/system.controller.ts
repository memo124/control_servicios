import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

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

  @Get('backup')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios.gestionar')
  @Header('Content-Type', 'application/sql; charset=utf-8')
  async downloadBackup(@CurrentUser() user: AuthUser) {
    const backup = await this.service.createBackupForDownload(user);
    return new StreamableFile(Buffer.from(backup.sql, 'utf8'), {
      type: 'application/sql',
      disposition: `attachment; filename="${backup.filename}"`,
    });
  }
}
