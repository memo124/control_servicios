import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { RegisterUserDto } from '../auth/dto/auth.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('usuarios.gestionar')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Permissions('usuarios.gestionar')
  create(@Body() dto: RegisterUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id/status')
  @Permissions('usuarios.gestionar')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.usersService.updateStatus(id, status);
  }

  @Get('roles')
  @Permissions('usuarios.gestionar')
  roles() {
    return this.usersService.findRoles();
  }

  @Get('permissions')
  @Permissions('usuarios.gestionar')
  permissions() {
    return this.usersService.findPermissions();
  }
}
