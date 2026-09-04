import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.cliente.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.cliente.findUnique({ where: { id } });
  }

  create(data: {
    nombre: string;
    email?: string;
    telefono?: string;
    deseaNotificacionesCorreo?: boolean;
    aplicaDiasGracia?: boolean;
    diasGraciaDefault?: number;
  }) {
    return this.prisma.cliente.create({ data });
  }

  update(id: number, data: Record<string, unknown>) {
    return this.prisma.cliente.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.cliente.delete({ where: { id } });
  }
}
