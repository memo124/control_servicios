import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Roles
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

  const operadorPerms = ['suscripciones.ver', 'suscripciones.crear', 'suscripciones.editar', 'clientes.gestionar', 'cuentas.gestionar', 'finanzas.ver'];
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

  // Estados
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

  const cuentas = [
    { id: 1, plataformaId: 1, identificador: 'Familia #1', duenoNombre: 'Guillermo', costoMensual: 12, cuposTotales: 6 },
    { id: 2, plataformaId: 1, identificador: 'Familia #2', duenoNombre: 'Oscar', costoMensual: 12, cuposTotales: 6 },
    { id: 3, plataformaId: 1, identificador: 'Familia #3', duenoNombre: 'Enzo', costoMensual: 12, cuposTotales: 6 },
    { id: 4, plataformaId: 1, identificador: 'Familia #4', duenoNombre: 'Eric', costoMensual: 12, cuposTotales: 6 },
    { id: 5, plataformaId: 2, identificador: 'Cuenta 1', duenoNombre: 'Guillermo', costoMensual: 3, cuposTotales: 3 },
    { id: 6, plataformaId: 3, identificador: 'Cuenta 1', duenoNombre: 'Guillermo', costoMensual: 6, cuposTotales: 3 },
    { id: 7, plataformaId: 4, identificador: 'Cuenta 2', duenoNombre: 'Guillermo', costoMensual: 6, cuposTotales: 4 },
    { id: 8, plataformaId: 5, identificador: 'Cuenta 2', duenoNombre: 'Guillermo', costoMensual: 5, cuposTotales: 4 },
  ];
  for (const c of cuentas) {
    await prisma.cuentaPlataforma.upsert({ where: { id: c.id }, update: c, create: c });
  }

  const clientes = [
    { id: 1, nombre: 'Melissa', email: 'melissa@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 3 },
    { id: 2, nombre: 'Roberto', email: 'roberto@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 3, nombre: 'Sandor', email: 'sandor@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 5 },
    { id: 4, nombre: 'Paola', email: 'paola@email.com', deseaNotificacionesCorreo: false, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 5, nombre: 'Celso', email: 'celso@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 6, nombre: 'Mario', email: 'mario@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 },
    { id: 7, nombre: 'Hermano de sofia', email: 'sofia_h@email.com', deseaNotificacionesCorreo: true, aplicaDiasGracia: true, diasGraciaDefault: 2 },
  ];
  for (const c of clientes) {
    await prisma.cliente.upsert({ where: { id: c.id }, update: c, create: c });
  }

  const suscripcionesCount = await prisma.suscripcionCliente.count();
  if (suscripcionesCount === 0) {
    await prisma.suscripcionCliente.createMany({
      data: [
        { cuentaId: 1, clienteId: 1, perfilNombre: 'Melissa', precioCobro: 3, fechaCorte: new Date('2026-05-04'), aplicaGracia: true, diasGracia: 3 },
        { cuentaId: 1, clienteId: 2, perfilNombre: 'Roberto', precioCobro: 3, fechaCorte: new Date('2026-05-03'), aplicaGracia: false, diasGracia: 0 },
        { cuentaId: 1, clienteId: 3, perfilNombre: 'Sandor', precioCobro: 3, fechaCorte: new Date('2026-05-03'), aplicaGracia: true, diasGracia: 5 },
        { cuentaId: 2, clienteId: 4, perfilNombre: 'Paola', precioCobro: 3, fechaCorte: new Date('2026-05-04'), aplicaGracia: false, diasGracia: 0 },
        { cuentaId: 2, clienteId: 5, perfilNombre: 'Celso', precioCobro: 3, fechaCorte: new Date('2026-05-03'), aplicaGracia: false, diasGracia: 0 },
        { cuentaId: 5, clienteId: 3, perfilNombre: 'Sandor', precioCobro: 2, fechaCorte: new Date('2026-02-03'), aplicaGracia: true, diasGracia: 3 },
        { cuentaId: 5, clienteId: 2, perfilNombre: 'Roberto', precioCobro: 2, fechaCorte: new Date('2026-02-03'), aplicaGracia: false, diasGracia: 0 },
        { cuentaId: 7, clienteId: 1, perfilNombre: 'Melissa', precioCobro: 2, fechaCorte: new Date('2026-01-31'), aplicaGracia: true, diasGracia: 5 },
      ],
    });
  }

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

  console.log('Seed completado. Admin: admin@controlservicios.local / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
