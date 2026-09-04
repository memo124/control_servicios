import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        roles: { include: { role: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: RegisterUserDto) {
    const role = await this.prisma.role.findUnique({ where: { slug: dto.roleSlug } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roles: { create: { roleId: role.id } },
      },
      select: { id: true, name: true, email: true, status: true },
    });
    return user;
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  findRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
  }

  findPermissions() {
    return this.prisma.permission.findMany({ orderBy: { slug: 'asc' } });
  }
}
