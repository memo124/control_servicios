# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.0.0] - 2026-09-04

### Added
- Monorepo npm workspaces con backend NestJS y frontend Vue 3
- Esquema PostgreSQL completo con Prisma (plataformas, cuentas, clientes, suscripciones, estados, reglas)
- RBAC con roles admin, operador, auditor y permisos granulares
- Vistas SQL `v_suscripciones_detalle` y `v_balance_financiero` para estados y finanzas
- Dashboard financiero con KPIs globales y desglose por plataforma
- CRUD de suscripciones, clientes, cuentas y plantillas de correo
- Editor de plantillas HTML con previsualización en vivo
- Motor de notificaciones con BullMQ + Resend y cron diario
- Tabla `historial_notificaciones` para auditoría de envíos
- Tabla `system_versions` para control de versiones del sistema
- UI responsive (móvil/tablet/desktop) estilo Dashboard SaaS con Tailwind CSS
- Seed con datos de ejemplo del DDL proporcionado

### Security
- Autenticación JWT con bcrypt para contraseñas
- Guards de permisos por endpoint

[1.0.0]: https://github.com/memo124/control_servicios/releases/tag/v1.0.0
