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

  /** Padres referenciados por FK (child -> parents) */
  private async getTableDependencyMap(): Promise<Map<string, string[]>> {
    const rows = await this.prisma.$queryRaw<
      { child_table: string; parent_table: string }[]
    >`
      SELECT
        tc.table_name AS child_table,
        ccu.table_name AS parent_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `;
    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (row.parent_table === row.child_table) continue;
      const list = map.get(row.child_table) ?? [];
      if (!list.includes(row.parent_table)) list.push(row.parent_table);
      map.set(row.child_table, list);
    }
    return map;
  }

  /** Orden: tablas padre antes que hijas (para INSERT) */
  private sortTablesByForeignKeys(tables: string[], deps: Map<string, string[]>): string[] {
    const tableSet = new Set(tables);
    const sorted: string[] = [];
    const visited = new Set<string>();

    const visit = (table: string, stack: Set<string>) => {
      if (visited.has(table)) return;
      if (stack.has(table)) return;
      stack.add(table);
      for (const parent of deps.get(table) ?? []) {
        if (tableSet.has(parent)) visit(parent, stack);
      }
      stack.delete(table);
      visited.add(table);
      sorted.push(table);
    };

    for (const table of tables) visit(table, new Set());
    return sorted;
  }

  private async getTableConstraints(): Promise<
    { table_name: string; constraint_name: string; definition: string; contype: string }[]
  > {
    return this.prisma.$queryRaw`
      SELECT
        c.relname AS table_name,
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS definition,
        con.contype::text AS contype
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND con.contype IN ('p', 'f')
      ORDER BY CASE con.contype WHEN 'p' THEN 0 WHEN 'f' THEN 1 ELSE 2 END, c.relname, con.conname
    `;
  }

  private async writeConstraints(write: (text: string) => void): Promise<void> {
    const constraints = await this.getTableConstraints();
    if (!constraints.length) return;
    write('-- Restricciones PK / FK\n');
    for (const c of constraints) {
      const table = c.table_name.replace(/"/g, '""');
      const cname = c.constraint_name.replace(/"/g, '""');
      write(
        `DO $$ BEGIN ALTER TABLE ONLY public."${table}" ADD CONSTRAINT "${cname}" ${c.definition}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n`,
      );
    }
    write('\n');
  }

  private async writeSequenceResets(write: (text: string) => void): Promise<void> {
    const rows = await this.prisma.$queryRaw<
      { table_name: string; column_name: string }[]
    >`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_default LIKE 'nextval%'
    `;
    if (!rows.length) return;
    write('-- Secuencias\n');
    for (const row of rows) {
      const col = row.column_name.replace(/"/g, '""');
      const tbl = row.table_name.replace(/"/g, '""');
      write(
        `SELECT setval(pg_get_serial_sequence('public.${tbl}', '${col}'), COALESCE((SELECT MAX("${col}") FROM public."${tbl}"), 1), true);\n`,
      );
    }
    write('\n');
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
    write('-- Restaurar (BD vacía o solo schema public limpio):\n');
    write('--   psql -h HOST -U USER -d DB -f archivo.sql\n');
    write('-- Orden: tablas -> datos (padres antes que hijos) -> PK/FK -> índices -> vistas -> secuencias\n\n');
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
    const deps = await this.getTableDependencyMap();
    const tablesForData = this.sortTablesByForeignKeys(tables, deps);

    write('-- Tablas (sin FK; las restricciones van después de los datos)\n');
    for (const table of tables) {
      const ddl = await this.getTableDdl(table);
      if (ddl) write(`${ddl}\n\n`);
    }

    write('-- Datos (orden por dependencias FK)\n');
    for (const table of tablesForData) {
      await this.dumpTableData(table, write);
    }

    await this.writeConstraints(write);

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

    await this.writeSequenceResets(write);

    write('SET session_replication_role = DEFAULT;\n');
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
