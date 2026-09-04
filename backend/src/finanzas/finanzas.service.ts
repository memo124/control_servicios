import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BalanceRow {
  cuenta_id: number;
  plataforma_id: number;
  plataforma: string;
  cuenta: string;
  dueno_cuenta: string;
  costo_pagado_dueno: string;
  total_cobrado_clientes: string;
  total_perfiles_vendidos: bigint;
  ganancia_neta_cuenta: string;
  costo_acumulado_plataforma: string;
  cobro_acumulado_plataforma: string;
  ganancia_acumulada_plataforma: string;
}

export interface BalanceResumen {
  costo_total_pagado: string;
  total_ingresos_clientes: string;
  ganancia_neta_total: string;
}

@Injectable()
export class FinanzasService {
  constructor(private prisma: PrismaService) {}

  async getBalance() {
    return this.prisma.$queryRaw<BalanceRow[]>`
      SELECT * FROM v_balance_financiero ORDER BY plataforma, cuenta
    `;
  }

  async getResumen() {
    const rows = await this.prisma.$queryRaw<BalanceResumen[]>`
      SELECT 
        SUM(costo_pagado_dueno)::text AS costo_total_pagado,
        SUM(total_cobrado_clientes)::text AS total_ingresos_clientes,
        SUM(ganancia_neta_cuenta)::text AS ganancia_neta_total
      FROM v_balance_financiero
    `;
    return rows[0];
  }

  async getPorPlataforma() {
    const rows = await this.getBalance();
    const map = new Map<string, {
      plataforma: string;
      costo: number;
      ingresos: number;
      ganancia: number;
      cuentas: number;
    }>();

    for (const r of rows) {
      const existing = map.get(r.plataforma) ?? {
        plataforma: r.plataforma,
        costo: 0,
        ingresos: 0,
        ganancia: 0,
        cuentas: 0,
      };
      existing.costo += parseFloat(r.costo_pagado_dueno);
      existing.ingresos += parseFloat(r.total_cobrado_clientes);
      existing.ganancia += parseFloat(r.ganancia_neta_cuenta);
      existing.cuentas += 1;
      map.set(r.plataforma, existing);
    }
    return Array.from(map.values());
  }
}
