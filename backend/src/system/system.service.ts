import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  getVersion() {
    return {
      app: process.env.APP_VERSION ?? '1.0.0',
      node: process.version,
    };
  }

  getChangelog() {
    return this.prisma.systemVersion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  addVersion(data: { version: string; titulo: string; descripcion?: string; tipo?: string }) {
    return this.prisma.systemVersion.create({ data });
  }
}
