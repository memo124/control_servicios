import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstadosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.estado.findMany({
      include: { reglas: { orderBy: { prioridad: 'asc' } } },
      orderBy: { id: 'asc' },
    });
  }

  updateRegla(id: number, data: Record<string, unknown>) {
    return this.prisma.estadoRegla.update({ where: { id }, data });
  }
}
