import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RegisterUserDto, UpdateUserDto } from '../auth/dto/auth.dto';
import { AuthUser } from '../auth/auth.service';

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

  @Patch(':id')
  @Permissions('usuarios.gestionar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.update(id, dto, user.id);
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
