import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface DbBackupResult {
  sql: string;
  filename: string;
  dbName: string;
  tableCount: number;
  viewCount: number;
  sizeBytes: number;
}

interface EnumRow {
  name: string;
  labels: string[];
}

interface ViewRow {
  viewname: string;
  definition: string;
}

interface DdlRow {
  ddl: string | null;
}

interface ColumnRow {
  column_name: string;
}

@Injectable()
export class DbBackupService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private sqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (value instanceof Date) {
      return `'${value.toISOString().replace('T', ' ').replace('Z', '+00')}'`;
    }
    if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'`;
    if (Array.isArray(value)) {
      return `ARRAY[${value.map((v) => this.sqlLiteral(v)).join(',')}]`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    if (typeof value === 'bigint') return String(value);
    return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
  }

  private dbNameFromUrl(): string {
    const url = this.config.get<string>('DATABASE_URL') ?? '';
    try {
      return new URL(url).pathname.replace(/^\//, '').split('?')[0] || 'control_servicios_db';
    } catch {
      return 'control_servicios_db';
    }
  }

  private async getTables(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    return rows.map((r) => r.tablename);
  }

  private async getViews(): Promise<ViewRow[]> {
    return this.prisma.$queryRaw<ViewRow[]>`
      SELECT viewname, definition FROM pg_views WHERE schemaname = 'public' ORDER BY viewname
    `;
  }

  private async getEnums(): Promise<EnumRow[]> {
    return this.prisma.$queryRaw<EnumRow[]>`
      SELECT t.typname AS name,
             array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `;
  }

  private async getTableDdl(table: string): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<DdlRow[]>(
      `
      SELECT
        'CREATE TABLE IF NOT EXISTS ' || quote_ident(n.nspname) || '.' || quote_ident(c.relname) || E' (\\n' ||
        string_agg(
          '  ' || quote_ident(a.attname) || ' ' ||
          pg_catalog.format_type(a.atttypid, a.atttypmod) ||
          CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN ad.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid) ELSE '' END,
          E',\\n' ORDER BY a.attnum
        ) || E'\\n);' AS ddl
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
        AND c.relname = $1
        AND a.attnum > 0
        AND NOT a.attisdropped
      GROUP BY n.nspname, c.relname
      `,
      table,
    );
    return rows[0]?.ddl ?? '';
  }

  private async getIndexes(table: string): Promise<string[]> {
    const rows = await this.prisma.$queryRawUnsafe<DdlRow[]>(
      `
      SELECT indexdef || ';' AS ddl
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1
        AND indexname NOT LIKE '%_pkey'
      ORDER BY indexname
      `,
      table,
    );
    return rows.map((r) => r.ddl ?? '').filter(Boolean);
  }

  private async dumpTableData(
    table: string,
    write: (text: string) => void,
  ): Promise<void> {
    const colsRes = await this.prisma.$queryRawUnsafe<ColumnRow[]>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      table,
    );
    const columns = colsRes.map((r) => r.column_name);
    if (!columns.length) return;

    const quotedTable = table.replace(/"/g, '""');
    const quotedCols = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM public."${quotedTable}"`,
    );
    if (!rows.length) return;

    write(`\n-- Datos: ${table} (${rows.length} filas)\n`);
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch
        .map((row) => {
          const vals = columns.map((col) => this.sqlLiteral(row[col]));
          return `(${vals.join(', ')})`;
        })
        .join(',\n  ');
      write(
        `INSERT INTO public."${quotedTable}" (${quotedCols}) VALUES\n  ${values}\nON CONFLICT DO NOTHING;\n`,
      );
    }
  }

  async generate(): Promise<DbBackupResult> {
    const dbName = this.dbNameFromUrl();
    const chunks: string[] = [];
    const write = (text: string) => chunks.push(text);

    write('-- Backup Control Servicios\n');
    write(`-- Base de datos: ${dbName}\n`);
    write(`-- Generado: ${new Date().toISOString()}\n`);
    write('-- Restaurar: psql -h HOST -U USER -d DB -f archivo.sql\n\n');
    write('BEGIN;\n');
    write('SET session_replication_role = replica;\n\n');

    const enums = await this.getEnums();
    for (const en of enums) {
      const labels = en.labels.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(', ');
      write(
        `DO $$ BEGIN CREATE TYPE public."${en.name}" AS ENUM (${labels}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n`,
      );
    }
    if (enums.length) write('\n');

    const tables = await this.getTables();
    write('-- Tablas\n');
    for (const table of tables) {
      const ddl = await this.getTableDdl(table);
      if (ddl) write(`${ddl}\n\n`);
    }

    write('-- Índices\n');
    for (const table of tables) {
      for (const idx of await this.getIndexes(table)) write(`${idx}\n`);
    }
    write('\n');

    const views = await this.getViews();
    if (views.length) {
      write('-- Vistas\n');
      for (const v of views) {
        write(
          `CREATE OR REPLACE VIEW public."${v.viewname.replace(/"/g, '""')}" AS\n${v.definition.trim()}\n;\n\n`,
        );
      }
    }

    write('-- Datos\n');
    for (const table of tables) {
      await this.dumpTableData(table, write);
    }

    write('\nSET session_replication_role = DEFAULT;\n');
    write('COMMIT;\n');

    const sql = chunks.join('');
    const filename = `${dbName}_${this.timestamp()}.sql`;
    return {
      sql,
      filename,
      dbName,
      tableCount: tables.length,
      viewCount: views.length,
      sizeBytes: Buffer.byteLength(sql, 'utf8'),
    };
  }
}
