/**
 * Backup lógico PostgreSQL → archivo .sql (schema + datos).
 * Uso: node scripts/db-backup.cjs
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const ROOT = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT, 'backups');
const backendRequire = createRequire(path.join(ROOT, 'backend', 'package.json'));
const { PrismaClient } = backendRequire('@prisma/client');

function loadDatabaseUrl() {
  const envPath = path.join(ROOT, 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('No se encontró backend/.env');
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const match = raw.match(/^DATABASE_URL=(.+)$/m);
  if (!match) {
    throw new Error('DATABASE_URL no definida en backend/.env');
  }
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof Date) return `'${value.toISOString().replace('T', ' ').replace('Z', '+00')}'`;
  if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'`;
  if (Array.isArray(value)) {
    const inner = value.map((v) => sqlLiteral(v)).join(',');
    return `ARRAY[${inner}]`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

async function getTables(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  return rows.map((r) => r.tablename);
}

async function getViews(prisma) {
  return prisma.$queryRaw`
    SELECT viewname, definition
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname
  `;
}

async function getEnums(prisma) {
  return prisma.$queryRaw`
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

async function getTableDdl(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
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

async function getIndexes(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT indexdef || ';' AS ddl
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
      AND indexname NOT LIKE '%_pkey'
    ORDER BY indexname
    `,
    table,
  );
  return rows.map((r) => r.ddl);
}

async function dumpTableData(prisma, table, write) {
  const colsRes = await prisma.$queryRawUnsafe(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    table,
  );
  const columns = colsRes.map((r) => r.column_name);
  if (columns.length === 0) return;

  const quotedCols = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM public."${table.replace(/"/g, '""')}"`,
  );
  if (rows.length === 0) return;

  write(`\n-- Datos: ${table} (${rows.length} filas)\n`);
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch
      .map((row) => {
        const vals = columns.map((col) => sqlLiteral(row[col]));
        return `(${vals.join(', ')})`;
      })
      .join(',\n  ');
    write(
      `INSERT INTO public."${table.replace(/"/g, '""')}" (${quotedCols}) VALUES\n  ${values}\nON CONFLICT DO NOTHING;\n`,
    );
  }
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '').split('?')[0];

  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const outFile = path.join(BACKUPS_DIR, `${dbName}_${timestamp()}.sql`);
  const chunks = [];

  const write = (text) => chunks.push(text);

  write('-- Backup Control Servicios\n');
  write(`-- Base de datos: ${dbName}\n`);
  write(`-- Generado: ${new Date().toISOString()}\n`);
  write('-- Restaurar: psql -h HOST -U USER -d DB -f archivo.sql\n\n');
  write('BEGIN;\n');
  write('SET session_replication_role = replica;\n\n');

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();

  try {
    const enums = await getEnums(prisma);
    for (const en of enums) {
      const labels = en.labels.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(', ');
      write(`DO $$ BEGIN CREATE TYPE public."${en.name}" AS ENUM (${labels}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n`);
    }
    if (enums.length) write('\n');

    const tables = await getTables(prisma);
    write('-- Tablas\n');
    for (const table of tables) {
      const ddl = await getTableDdl(prisma, table);
      if (ddl) write(`${ddl}\n\n`);
    }

    write('-- Índices\n');
    for (const table of tables) {
      const indexes = await getIndexes(prisma, table);
      for (const idx of indexes) write(`${idx}\n`);
    }
    write('\n');

    const views = await getViews(prisma);
    if (views.length) {
      write('-- Vistas\n');
      for (const v of views) {
        write(`CREATE OR REPLACE VIEW public."${v.viewname.replace(/"/g, '""')}" AS\n${v.definition.trim()}\n;\n\n`);
      }
    }

    write('-- Datos\n');
    for (const table of tables) {
      await dumpTableData(prisma, table, write);
    }

    write('\nSET session_replication_role = DEFAULT;\n');
    write('COMMIT;\n');

    fs.writeFileSync(outFile, chunks.join(''), 'utf8');
    const stat = fs.statSync(outFile);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`Backup OK: ${outFile}`);
    console.log(`Tamaño: ${sizeMb} MB`);
    console.log(`Tablas: ${tables.length}, Vistas: ${views.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error al crear backup:', err.message);
  process.exit(1);
});
