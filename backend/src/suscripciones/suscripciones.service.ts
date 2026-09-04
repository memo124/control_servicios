import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SuscripcionDetalle {
  suscripcion_id: number;
  cuenta_id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_email: string | null;
  desea_notificaciones_correo: boolean;
  plataforma: string;
  cuenta_identificador: string;
  dueno_cuenta: string;
  perfil_nombre: string | null;
  precio_cobro: string;
  fecha_corte: Date;
  aplica_gracia: boolean;
  dias_gracia: number;
  activo: boolean;
  fecha_limite_gracia: Date;
  dias_vencido: number;
  dias_gracia_restantes: number;
  estado_codigo: string;
  estado_nombre: string;
  permite_acceso: boolean;
  color_hex: string;
}

@Injectable()
export class SuscripcionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    plataforma?: string;
    estado?: string;
    dueno?: string;
    activo?: boolean;
  }) {
    let rows = await this.prisma.$queryRaw<SuscripcionDetalle[]>`
      SELECT * FROM v_suscripciones_detalle ORDER BY suscripcion_id ASC
    `;

    if (filters?.plataforma) {
      rows = rows.filter((r) =>
        r.plataforma.toLowerCase().includes(filters.plataforma!.toLowerCase()),
      );
    }
    if (filters?.estado) {
      rows = rows.filter((r) => r.estado_codigo === filters.estado);
    }
    if (filters?.dueno) {
      rows = rows.filter((r) =>
        r.dueno_cuenta.toLowerCase().includes(filters.dueno!.toLowerCase()),
      );
    }
    if (filters?.activo !== undefined) {
      rows = rows.filter((r) => r.activo === filters.activo);
    }
    return rows;
  }

  async findOne(id: number) {
    const rows = await this.prisma.$queryRaw<SuscripcionDetalle[]>`
      SELECT * FROM v_suscripciones_detalle WHERE suscripcion_id = ${id}
    `;
    return rows[0] ?? null;
  }

  create(data: {
    cuentaId: number;
    clienteId: number;
    perfilNombre?: string;
    precioCobro: number;
    fechaCorte: string;
    aplicaGracia?: boolean;
    diasGracia?: number;
  }) {
    return this.prisma.suscripcionCliente.create({
      data: {
        cuentaId: data.cuentaId,
        clienteId: data.clienteId,
        perfilNombre: data.perfilNombre,
        precioCobro: data.precioCobro,
        fechaCorte: new Date(data.fechaCorte),
        aplicaGracia: data.aplicaGracia ?? false,
        diasGracia: data.diasGracia ?? 0,
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      cuentaId: number;
      clienteId: number;
      perfilNombre: string;
      precioCobro: number;
      fechaCorte: string;
      aplicaGracia: boolean;
      diasGracia: number;
      activo: boolean;
    }>,
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.fechaCorte) updateData.fechaCorte = new Date(data.fechaCorte);
    return this.prisma.suscripcionCliente.update({ where: { id }, data: updateData });
  }

  remove(id: number) {
    return this.prisma.suscripcionCliente.delete({ where: { id } });
  }
}
