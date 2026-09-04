import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlantillasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.plantillaCorreo.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.plantillaCorreo.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.plantillaCorreo.findUnique({ where: { codigo } });
  }

  update(id: number, data: { asunto?: string; cuerpoHtml?: string; activo?: boolean }) {
    return this.prisma.plantillaCorreo.update({ where: { id }, data });
  }

  preview(id: number, variables: Record<string, string>) {
    return this.findOne(id).then((tpl) => {
      if (!tpl) return null;
      let html = tpl.cuerpoHtml;
      let asunto = tpl.asunto;
      for (const [key, val] of Object.entries(variables)) {
        const token = `{{${key}}}`;
        html = html.split(token).join(val);
        asunto = asunto.split(token).join(val);
      }
      return { asunto, html };
    });
  }
}
