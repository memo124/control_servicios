import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CuentasService {
  constructor(private prisma: PrismaService) {}

  findAll(plataformaId?: number) {
    return this.prisma.cuentaPlataforma.findMany({
      where: plataformaId ? { plataformaId } : undefined,
      include: { plataforma: true, suscripciones: { where: { activo: true } } },
      orderBy: { id: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.cuentaPlataforma.findUnique({
      where: { id },
      include: { plataforma: true, suscripciones: true },
    });
  }

  create(data: {
    plataformaId: number;
    identificador: string;
    duenoNombre: string;
    costoMensual: number;
    cuposTotales?: number;
    fechaCorteCuenta?: string;
  }) {
    return this.prisma.cuentaPlataforma.create({
      data: {
        ...data,
        fechaCorteCuenta: data.fechaCorteCuenta ? new Date(data.fechaCorteCuenta) : undefined,
      },
      include: { plataforma: true },
    });
  }

  update(id: number, data: Record<string, unknown>) {
    if (data.fechaCorteCuenta) {
      data.fechaCorteCuenta = new Date(data.fechaCorteCuenta as string);
    }
    return this.prisma.cuentaPlataforma.update({
      where: { id },
      data,
      include: { plataforma: true },
    });
  }

  remove(id: number) {
    return this.prisma.cuentaPlataforma.delete({ where: { id } });
  }
}
