import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto, UpdateUserDto } from '../auth/dto/auth.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  telefono: true,
  status: true,
  createdAt: true,
  roles: { include: { role: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: userSelect,
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: RegisterUserDto) {
    const role = await this.prisma.role.findUnique({ where: { slug: dto.roleSlug } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          telefono: dto.telefono?.trim() || null,
          passwordHash,
          roles: { create: { roleId: role.id } },
        },
        select: userSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateUserDto, actorId?: number) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (actorId === id && dto.status === 'inactive') {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.telefono !== undefined) data.telefono = dto.telefono.trim() || null;

    let roleId: number | undefined;
    if (dto.roleSlug !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { slug: dto.roleSlug } });
      if (!role) throw new NotFoundException('Rol no encontrado');
      roleId = role.id;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (roleId !== undefined) {
          await tx.roleUser.deleteMany({ where: { userId: id } });
          await tx.roleUser.create({ data: { userId: id, roleId } });
        }
        return tx.user.update({
          where: { id },
          data,
          select: userSelect,
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw e;
    }
  }

  async updateStatus(id: number, status: string) {
    return this.update(id, { status });
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
