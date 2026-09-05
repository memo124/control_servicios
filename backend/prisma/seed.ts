import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const d = (iso: string) => new Date(iso);

async function main() {
  // ── Roles y permisos ──────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { slug: 'admin' },
    update: {},
    create: { nombre: 'Administrador', slug: 'admin' },
  });
  const operadorRole = await prisma.role.upsert({
    where: { slug: 'operador' },
    update: {},
    create: { nombre: 'Operador', slug: 'operador' },
  });
  const auditorRole = await prisma.role.upsert({
    where: { slug: 'auditor' },
    update: {},
    create: { nombre: 'Auditor', slug: 'auditor' },
  });

  const permissions = [
    { nombre: 'Ver suscripciones', slug: 'suscripciones.ver' },
    { nombre: 'Crear suscripciones', slug: 'suscripciones.crear' },
    { nombre: 'Editar suscripciones', slug: 'suscripciones.editar' },
    { nombre: 'Eliminar suscripciones', slug: 'suscripciones.eliminar' },
    { nombre: 'Ver finanzas', slug: 'finanzas.ver' },
    { nombre: 'Gestionar clientes', slug: 'clientes.gestionar' },
    { nombre: 'Gestionar cuentas', slug: 'cuentas.gestionar' },
    { nombre: 'Enviar correos', slug: 'correos.enviar' },
    { nombre: 'Editar plantillas', slug: 'plantillas.editar' },
    { nombre: 'Gestionar usuarios', slug: 'usuarios.gestionar' },
  ];

  for (const perm of permissions) {
    const p = await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
    await prisma.permissionRole.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  const operadorPerms = [
    'suscripciones.ver', 'suscripciones.crear', 'suscripciones.editar',
    'clientes.gestionar', 'cuentas.gestionar', 'finanzas.ver',
  ];
  for (const slug of operadorPerms) {
    const p = await prisma.permission.findUnique({ where: { slug } });
    if (p) {
      await prisma.permissionRole.upsert({
        where: { roleId_permissionId: { roleId: operadorRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: operadorRole.id, permissionId: p.id },
      });
    }
  }

  const auditorPerms = ['suscripciones.ver', 'finanzas.ver'];
  for (const slug of auditorPerms) {
    const p = await prisma.permission.findUnique({ where: { slug } });
    if (p) {
      await prisma.permissionRole.upsert({
        where: { roleId_permissionId: { roleId: auditorRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: auditorRole.id, permissionId: p.id },
      });
    }
  }

  // ── Usuarios ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@controlservicios.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@controlservicios.local',
      passwordHash,
      status: 'active',
    },
  });
  await prisma.roleUser.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  const operadorPasswordHash = await bcrypt.hash('Operador123!', 10);
  const operadores = [
    { name: 'Guillermo', email: 'guillermo@controlservicios.local' },
    { name: 'Oscar', email: 'oscar@controlservicios.local' },
    { name: 'Enzo', email: 'enzo@controlservicios.local' },
    { name: 'Eric', email: 'eric@controlservicios.local' },
  ];
  // Operador legacy con correo personal (ya no se usa)
  const legacyOperador = await prisma.user.findUnique({ where: { email: 'mineromemo429@gmail.com' } });
  if (legacyOperador) {
    await prisma.historialNotificacionDueno.deleteMany({ where: { userId: legacyOperador.id } });
    await prisma.roleUser.deleteMany({ where: { userId: legacyOperador.id } });
    await prisma.user.delete({ where: { id: legacyOperador.id } });
  }
  for (const op of operadores) {
    const user = await prisma.user.upsert({
      where: { email: op.email },
      update: { name: op.name },
      create: {
        name: op.name,
        email: op.email,
        passwordHash: operadorPasswordHash,
        status: 'active',
      },
    });
    await prisma.roleUser.upsert({
      where: { userId_roleId: { userId: user.id, roleId: operadorRole.id } },
      update: {},
      create: { userId: user.id, roleId: operadorRole.id },
    });
  }

  // ── Estados ─────────────────────────────────────────────────────────
  const estados = [
    { id: 1, codigo: 'DISPONIBLE', nombre: 'Disponible / Al Día', descripcion: 'Servicio activo con pago vigente', permiteAcceso: true, colorHex: '#28a745' },
    { id: 2, codigo: 'VENCE_HOY', nombre: 'Vence Hoy', descripcion: 'Fecha de corte coincide con el día actual', permiteAcceso: true, colorHex: '#ffc107' },
    { id: 3, codigo: 'EN_GRACIA', nombre: 'Días de Gracia', descripcion: 'Fecha de corte expirada pero dentro del margen de gracia', permiteAcceso: true, colorHex: '#17a2b8' },
    { id: 4, codigo: 'VENCIDA', nombre: 'Vencida / Cortada', descripcion: 'Servicio suspendido por falta de pago', permiteAcceso: false, colorHex: '#dc3545' },
  ];
  for (const e of estados) {
    await prisma.estado.upsert({ where: { id: e.id }, update: e, create: e });
  }

  const reglas = [
    { estadoId: 1, requiereGraciaActiva: false, diasVencidoMin: -99999, diasVencidoMax: -1, diasGraciaRestantesMin: -99999, diasGraciaRestantesMax: 99999, prioridad: 10 },
    { estadoId: 2, requiereGraciaActiva: false, diasVencidoMin: 0, diasVencidoMax: 0, diasGraciaRestantesMin: -99999, diasGraciaRestantesMax: 99999, prioridad: 20 },
    { estadoId: 3, requiereGraciaActiva: true, diasVencidoMin: 1, diasVencidoMax: 99999, diasGraciaRestantesMin: 0, diasGraciaRestantesMax: 99999, prioridad: 30 },
    { estadoId: 4, requiereGraciaActiva: false, diasVencidoMin: 1, diasVencidoMax: 99999, diasGraciaRestantesMin: -99999, diasGraciaRestantesMax: 99999, prioridad: 40 },
  ];
  const existingReglas = await prisma.estadoRegla.count();
  if (existingReglas === 0) {
    await prisma.estadoRegla.createMany({ data: reglas });
  }

  // ── Plataformas ─────────────────────────────────────────────────────
  const plataformas = [
    { id: 1, nombre: 'Spotify' },
    { id: 2, nombre: 'HBO Max' },
    { id: 3, nombre: 'Amazon Prime' },
    { id: 4, nombre: 'Disney+' },
    { id: 5, nombre: 'Crunchyroll' },
  ];
  for (const p of plataformas) {
    await prisma.plataforma.upsert({ where: { id: p.id }, update: p, create: p });
  }

  // ── Cuentas (dueños según hoja de control) ───────────────────────────
  // Guillermo: Familia #1 Spotify, HBO 1, Amazon Cuenta 1, Disney+ Cuenta 2, Crunchyroll Cuenta 2
  // Oscar: Familia #2 | Enzo: Familia #3 | Eric: Familia #4
  const cuentas = [
    { id: 1, plataformaId: 1, identificador: 'Familia #1', duenoNombre: 'Guillermo', costoMensual: 12, cuposTotales: 6 },
    { id: 2, plataformaId: 1, identificador: 'Familia #2', duenoNombre: 'Oscar', costoMensual: 12, cuposTotales: 6 },
    { id: 3, plataformaId: 1, identificador: 'Familia #3', duenoNombre: 'Enzo', costoMensual: 12, cuposTotales: 6 },
    { id: 4, plataformaId: 1, identificador: 'Familia #4', duenoNombre: 'Eric', costoMensual: 12, cuposTotales: 6 },
    { id: 5, plataformaId: 2, identificador: 'HBO 1', duenoNombre: 'Guillermo', costoMensual: 3, cuposTotales: 4 },
    { id: 6, plataformaId: 3, identificador: 'Cuenta 1', duenoNombre: 'Guillermo', costoMensual: 6, cuposTotales: 4 },
    { id: 7, plataformaId: 4, identificador: 'Cuenta 2', duenoNombre: 'Guillermo', costoMensual: 6, cuposTotales: 4 },
    { id: 8, plataformaId: 5, identificador: 'Cuenta 2', duenoNombre: 'Guillermo', costoMensual: 5, cuposTotales: 4 },
  ];
  for (const c of cuentas) {
    await prisma.cuentaPlataforma.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ── Clientes ─────────────────────────────────────────────────────────
  // id 19 = cupo sin asignar (perfiles vacíos en la hoja)
  const clientes = [
    { id: 1, nombre: 'Melissa', email: 'melissa@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 3 },
    { id: 2, nombre: 'Hermano de sofia', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 3 },
    { id: 3, nombre: 'Alejandro', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 4, nombre: 'Roberto', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 5, nombre: 'Fernando - hermano', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 2 },
    { id: 6, nombre: 'Edwin valdez', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 7, nombre: 'Celso', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 8, nombre: 'Mario', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 9, nombre: 'Paola', email: null, deseaNotificacionesCorreo: false, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 10, nombre: 'Andrea Catalan', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 11, nombre: 'Amy dias', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 12, nombre: 'Hamilton', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 13, nombre: 'Sandor', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 5 },
    { id: 14, nombre: 'David castillo', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 15, nombre: 'Amigo de david', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 16, nombre: 'Orlando hijo de sofia', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 2 },
    { id: 17, nombre: 'Moises', email: null, deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 19, nombre: 'Cupo disponible', email: null, deseaNotificacionesCorreo: false, aplicaDiasGracia: false, diasGraciaDefault: 0 },
  ];
  for (const c of clientes) {
    await prisma.cliente.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ── Suscripciones (sincroniza en cada seed) ───────────────────────────
  await prisma.historialNotificacion.deleteMany();
  await prisma.suscripcionCliente.deleteMany();

  type Sub = {
    cuentaId: number;
    clienteId: number;
    perfilNombre: string;
    precioCobro: number;
    fechaCorte: Date;
    aplicaGracia?: boolean;
    diasGracia?: number;
    activo?: boolean;
  };

  const suscripciones: Sub[] = [
    // Spotify — Familia #1 (Guillermo) — 6 perfiles
    { cuentaId: 1, clienteId: 1, perfilNombre: 'Melissa', precioCobro: 3, fechaCorte: d('2026-05-04'), aplicaGracia: true, diasGracia: 3 },
    { cuentaId: 1, clienteId: 2, perfilNombre: 'Hermano de sofia', precioCobro: 3, fechaCorte: d('2026-05-03'), aplicaGracia: true, diasGracia: 3 },
    { cuentaId: 1, clienteId: 3, perfilNombre: 'Alejandro', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 1, clienteId: 4, perfilNombre: 'Roberto', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 1, clienteId: 5, perfilNombre: 'Fernando - hermano', precioCobro: 3, fechaCorte: d('2026-05-04'), aplicaGracia: true, diasGracia: 2 },
    { cuentaId: 1, clienteId: 6, perfilNombre: 'Edwin valdez', precioCobro: 3, fechaCorte: d('2026-05-03') },

    // Spotify — Familia #2 (Oscar) — 5 perfiles
    { cuentaId: 2, clienteId: 7, perfilNombre: 'Celso', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 2, clienteId: 8, perfilNombre: 'Mario', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 2, clienteId: 9, perfilNombre: 'Paola', precioCobro: 3, fechaCorte: d('2026-05-04') },
    { cuentaId: 2, clienteId: 10, perfilNombre: 'Andrea Catalan', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 2, clienteId: 11, perfilNombre: 'Amy dias', precioCobro: 3, fechaCorte: d('2026-05-03') },

    // Spotify — Familia #3 (Enzo) — 5 perfiles
    { cuentaId: 3, clienteId: 12, perfilNombre: 'Hamilton', precioCobro: 2.5, fechaCorte: d('2026-05-03') },
    { cuentaId: 3, clienteId: 11, perfilNombre: 'Amy dias', precioCobro: 3, fechaCorte: d('2026-05-04') },
    { cuentaId: 3, clienteId: 13, perfilNombre: 'Sandor', precioCobro: 3, fechaCorte: d('2026-05-03'), aplicaGracia: true, diasGracia: 5 },
    { cuentaId: 3, clienteId: 14, perfilNombre: 'David castillo', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 3, clienteId: 15, perfilNombre: 'Amigo de david', precioCobro: 3, fechaCorte: d('2026-05-03') },

    // Spotify — Familia #4 (Eric) — 4 perfiles + 2 cupos sin asignar
    { cuentaId: 4, clienteId: 16, perfilNombre: 'Orlando hijo de sofia', precioCobro: 2.5, fechaCorte: d('2026-05-03'), aplicaGracia: true, diasGracia: 2 },
    { cuentaId: 4, clienteId: 17, perfilNombre: 'Moises', precioCobro: 3, fechaCorte: d('2026-05-03') },
    { cuentaId: 4, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 3, fechaCorte: d('2025-11-03') },
    { cuentaId: 4, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 3, fechaCorte: d('2026-02-03') },

    // HBO 1 (Guillermo) — 4 cupos
    { cuentaId: 5, clienteId: 13, perfilNombre: 'Sandor', precioCobro: 2, fechaCorte: d('2026-02-03'), aplicaGracia: true, diasGracia: 3 },
    { cuentaId: 5, clienteId: 4, perfilNombre: 'Roberto', precioCobro: 2, fechaCorte: d('2026-02-03') },
    { cuentaId: 5, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 0, fechaCorte: d('2024-02-03'), activo: false },
    { cuentaId: 5, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 0, fechaCorte: d('2023-03-05'), activo: false },

    // Amazon Prime — Cuenta 1 (Guillermo) — 4 cupos sin nombre explícito
    { cuentaId: 6, clienteId: 19, perfilNombre: 'Perfil 1', precioCobro: 2, fechaCorte: d('2023-12-02') },
    { cuentaId: 6, clienteId: 19, perfilNombre: 'Perfil 2', precioCobro: 0, fechaCorte: d('2022-11-02'), activo: false },
    { cuentaId: 6, clienteId: 19, perfilNombre: 'Perfil 3', precioCobro: 2.5, fechaCorte: d('2024-01-02') },
    { cuentaId: 6, clienteId: 19, perfilNombre: 'Perfil 4', precioCobro: 0, fechaCorte: d('2023-11-02'), activo: false },

    // Disney+ — Cuenta 2 (Guillermo) — 4 cupos
    { cuentaId: 7, clienteId: 1, perfilNombre: 'Melissa', precioCobro: 2, fechaCorte: d('2026-01-31'), aplicaGracia: true, diasGracia: 5 },
    { cuentaId: 7, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 0, fechaCorte: d('2024-01-15'), activo: false },
    { cuentaId: 7, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 0, fechaCorte: d('2024-01-15'), activo: false },
    { cuentaId: 7, clienteId: 19, perfilNombre: 'Sin asignar', precioCobro: 0, fechaCorte: d('2023-05-15'), activo: false },

    // Crunchyroll — Cuenta 2 (Guillermo) — 4 cupos
    { cuentaId: 8, clienteId: 19, perfilNombre: 'Perfil 1', precioCobro: 2.5, fechaCorte: d('2023-11-02') },
    { cuentaId: 8, clienteId: 19, perfilNombre: 'Perfil 2', precioCobro: 2.5, fechaCorte: d('2023-12-02') },
    { cuentaId: 8, clienteId: 19, perfilNombre: 'Perfil 3', precioCobro: 0, fechaCorte: d('2022-11-02'), activo: false },
    { cuentaId: 8, clienteId: 19, perfilNombre: 'Perfil 4', precioCobro: 0, fechaCorte: d('2022-11-02'), activo: false },
  ];

  await prisma.suscripcionCliente.createMany({
    data: suscripciones.map((s) => ({
      cuentaId: s.cuentaId,
      clienteId: s.clienteId,
      perfilNombre: s.perfilNombre,
      precioCobro: s.precioCobro,
      fechaCorte: s.fechaCorte,
      aplicaGracia: s.aplicaGracia ?? false,
      diasGracia: s.diasGracia ?? 0,
      activo: s.activo ?? true,
    })),
  });

  // ── Plantilla correo ──────────────────────────────────────────────────
  const plantillaHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
    .card { max-width: 520px; background: #ffffff; margin: 0 auto; border-radius: 8px; border: 1px solid #e1e4e8; padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 13px; color: #ffffff; background-color: {{color_hex}}; }
    .monto { font-size: 28px; font-weight: bold; color: #1a1a1a; margin: 16px 0; }
    .details { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .details td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .footer { font-size: 12px; color: #6c757d; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0;">Recordatorio de Servicio</h2>
      <span class="badge">{{estado_nombre}}</span>
    </div>
    <p>Hola <strong>{{cliente_nombre}}</strong>, adjuntamos el detalle del servicio contratado:</p>
    <div class="monto">\${{precio_cobro}} USD</div>
    <table class="details">
      <tr><td><strong>Servicio:</strong></td><td>{{plataforma}} ({{perfil_nombre}})</td></tr>
      <tr><td><strong>Fecha de corte:</strong></td><td>{{fecha_corte}}</td></tr>
      <tr><td><strong>Días de gracia aplicados:</strong></td><td>{{dias_gracia}} días</td></tr>
      <tr><td><strong>Fecha límite definitiva:</strong></td><td>{{fecha_limite_gracia}}</td></tr>
    </table>
    <p style="font-size: 13px; color: #444;">Si ya realizaste tu pago, ignora este mensaje.</p>
    <div class="footer">Panel de Administración de Servicios Streaming</div>
  </div>
</body>
</html>`;

  await prisma.plantillaCorreo.upsert({
    where: { codigo: 'AVISO_PAGO_SUSCRIPCION' },
    update: {},
    create: {
      codigo: 'AVISO_PAGO_SUSCRIPCION',
      asunto: 'Tu suscripción a {{plataforma}} - Estado: {{estado_nombre}}',
      cuerpoHtml: plantillaHtml,
      variablesDisponibles: ['cliente_nombre', 'plataforma', 'perfil_nombre', 'precio_cobro', 'fecha_corte', 'dias_gracia', 'fecha_limite_gracia', 'estado_nombre', 'color_hex'],
    },
  });

  const plantillasTelegram = [
    {
      codigo: 'TELEGRAM_TEST',
      titulo: 'Mensaje de prueba',
      cuerpoTexto: '<b>Control Servicios</b>\n\n✅ Mensaje de prueba.\nSi ves esto, Telegram está configurado correctamente.',
      variablesDisponibles: [],
    },
    {
      codigo: 'TELEGRAM_2FA_CODE',
      titulo: 'Código 2FA',
      cuerpoTexto: '<b>Control Servicios — 2FA</b>\n<b>Usuario:</b> {{usuario}}\n\nCódigo:\n<code>{{code}}</code>\n\nExpira en 5 minutos.',
      variablesDisponibles: ['code', 'usuario'],
    },
    {
      codigo: 'TELEGRAM_ALERTAS_SETUP',
      titulo: 'Confirmación alertas dueño',
      cuerpoTexto: '<b>Control Servicios</b>\n\n✅ Alertas activadas para <b>{{usuario}}</b>.\nLos avisos de clientes en gracia/vencidos se publican en este grupo.',
      variablesDisponibles: ['usuario'],
    },
    {
      codigo: 'TELEGRAM_ALERTAS_HEADER',
      titulo: 'Resumen alertas — encabezado',
      cuerpoTexto: '<b>🔔 Control Servicios</b>\n<b>Dueño:</b> {{dueno_nombre}}\n\nClientes que requieren que les escribas (el correo ya avisa al cliente):\n',
      variablesDisponibles: ['dueno_nombre'],
    },
    {
      codigo: 'TELEGRAM_TEST_GRUPO',
      titulo: 'Prueba al grupo de Telegram',
      cuerpoTexto:
        '<b>Control Servicios</b>\n\n✅ Mensaje de prueba al <b>grupo</b>.\nEnviado por: {{usuario}}\nSi ves esto, el bot puede publicar en el chat grupal.',
      variablesDisponibles: ['usuario'],
    },
    {
      codigo: 'TELEGRAM_ALERTAS_FOOTER',
      titulo: 'Resumen alertas — pie',
      cuerpoTexto: '<i>Responde a tus clientes por WhatsApp o teléfono.</i>',
      variablesDisponibles: [],
    },
    {
      codigo: 'TELEGRAM_BACKUP_BD',
      titulo: 'Aviso descarga backup BD',
      cuerpoTexto:
        '⚠️ <b>Backup de BD descargado</b>\n<b>Usuario:</b> {{usuario}}\n<b>Email:</b> {{email}}\n<b>Fecha:</b> {{fecha}}\n<b>Archivo:</b> {{archivo}}\n<b>Tamaño:</b> {{tamano}}',
      variablesDisponibles: ['usuario', 'email', 'fecha', 'archivo', 'tamano'],
    },
  ];

  for (const tpl of plantillasTelegram) {
    await prisma.plantillaTelegram.upsert({
      where: { codigo: tpl.codigo },
      update: {
        titulo: tpl.titulo,
        cuerpoTexto: tpl.cuerpoTexto,
        variablesDisponibles: tpl.variablesDisponibles,
      },
      create: tpl,
    });
  }

  await prisma.systemVersion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      version: '1.0.0',
      titulo: 'Lanzamiento inicial',
      descripcion: 'Versión inicial con dashboard financiero, gestión de suscripciones, RBAC, notificaciones Resend y estados dinámicos por reglas en BD.',
      tipo: 'major',
    },
  });

  const changelogEntries = [
    {
      version: '1.5.2',
      titulo: 'Backup de BD descargable con aviso Telegram',
      descripcion:
        'GET /api/system/backup para admins. npm run db:backup. Notificación TELEGRAM_BACKUP_BD al grupo.',
      tipo: 'minor',
    },
    {
      version: '1.5.1',
      titulo: 'Documentación de flujos y seguridad',
      descripcion:
        'docs/FLOWS.md: cron, correos, Telegram, plantillas, guía nuevos flujos. docs/SECURITY.md: auth, RBAC, pentest.',
      tipo: 'patch',
    },
    {
      version: '1.5.0',
      titulo: 'Telegram por grupo y plantillas editables',
      descripcion:
        'Telegram centralizado en TELEGRAM_GROUP_CHAT_ID (.env). Plantillas Telegram, PATCH /users/:id, teléfono en usuarios.',
      tipo: 'minor',
    },
    {
      version: '1.4.1',
      titulo: 'Corrección email operador Guillermo',
      descripcion:
        'Operador Guillermo usa guillermo@controlservicios.local. Seed elimina usuario legacy con correo personal.',
      tipo: 'patch',
    },
    {
      version: '1.4.0',
      titulo: 'Alertas Telegram para dueños de cuenta',
      descripcion:
        'Telegram a operadores/dueños cuando clientes están en gracia o vencidos. Correo sigue yendo al cliente. Configuración en Seguridad.',
      tipo: 'minor',
    },
    {
      version: '1.3.0',
      titulo: 'Registro de pagos en suscripciones',
      descripcion:
        'Botón +1 mes y modal para registrar 1–24 meses pagados. Avanza fecha de corte conservando el día del mes. POST /api/suscripciones/:id/registrar-pago.',
      tipo: 'minor',
    },
    {
      version: '1.2.1',
      titulo: 'Corrección tema claro',
      descripcion:
        'Variables CSS centralizadas y tablas/formularios adaptados al tema claro. Se eliminaron estilos oscuros hardcodeados en todas las vistas. Ver docs/THEMES.md.',
      tipo: 'patch',
    },
  ];

  for (const entry of changelogEntries) {
    const exists = await prisma.systemVersion.findFirst({ where: { version: entry.version } });
    if (!exists) {
      await prisma.systemVersion.create({ data: entry });
    }
  }

  console.log('Seed completado.');
  console.log(`  Suscripciones: ${suscripciones.length} (Spotify: 20, HBO: 4, Amazon: 4, Disney+: 4, Crunchyroll: 4)`);
  console.log('  Admin:    admin@controlservicios.local / Admin123!');
  console.log('  Operador: guillermo@controlservicios.local / Operador123! (Guillermo)');
  console.log('  Operador: oscar@controlservicios.local / Operador123!');
  console.log('  Operador: enzo@controlservicios.local / Operador123!');
  console.log('  Operador: eric@controlservicios.local / Operador123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
