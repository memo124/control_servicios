/**
 * Actualiza plantilla AVISO_PAGO_SUSCRIPCION desde prisma/templates/aviso-pago-suscripcion.html
 * Uso: npm run db:plantilla-correo
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'backend', 'prisma', 'templates', 'aviso-pago-suscripcion.html');
const backendRequire = createRequire(path.join(ROOT, 'backend', 'package.json'));
const { PrismaClient } = backendRequire('@prisma/client');

const VARIABLES = [
  'cliente_nombre',
  'plataforma',
  'perfil_nombre',
  'precio_cobro',
  'fecha_corte',
  'dias_gracia',
  'fecha_limite_gracia',
  'estado_nombre',
  'color_hex',
  'pago_banco',
  'pago_cuenta',
  'pago_titular',
  'pago_correo_comprobante',
  'pago_telefono_comprobante',
];

const ASUNTO = 'Tu suscripción a {{plataforma}} — {{estado_nombre}}';

function loadDatabaseUrl() {
  const envPath = path.join(ROOT, 'backend', '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const match = raw.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error('DATABASE_URL no definida en backend/.env');
  let value = match[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

async function main() {
  if (!fs.existsSync(HTML_PATH)) {
    throw new Error(`No se encontró ${HTML_PATH}`);
  }
  const cuerpoHtml = fs.readFileSync(HTML_PATH, 'utf8');
  const prisma = new PrismaClient({ datasources: { db: { url: loadDatabaseUrl() } } });

  try {
    const row = await prisma.plantillaCorreo.upsert({
      where: { codigo: 'AVISO_PAGO_SUSCRIPCION' },
      update: {
        asunto: ASUNTO,
        cuerpoHtml,
        variablesDisponibles: VARIABLES,
        activo: true,
      },
      create: {
        codigo: 'AVISO_PAGO_SUSCRIPCION',
        asunto: ASUNTO,
        cuerpoHtml,
        variablesDisponibles: VARIABLES,
        activo: true,
      },
    });
    console.log(`Plantilla actualizada: id=${row.id} codigo=${row.codigo}`);
    console.log(`Archivo fuente: ${HTML_PATH}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
