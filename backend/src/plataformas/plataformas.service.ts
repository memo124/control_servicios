import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlataformasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.plataforma.findMany({ orderBy: { id: 'asc' } });
  }

  create(data: { nombre: string; descripcion?: string }) {
    return this.prisma.plataforma.create({ data });
  }

  update(id: number, data: Record<string, unknown>) {
    return this.prisma.plataforma.update({ where: { id }, data });
  }
}
