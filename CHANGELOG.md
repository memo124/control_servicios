# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.2.1] - 2026-09-04

### Fixed
- Tema claro ilegible: texto blanco/gris claro sobre fondos blancos en tablas y formularios
- Tablas de Suscripciones, Cuentas, Clientes, Dashboard, Usuarios y Notificaciones sin contraste en light mode
- Labels de `FormField`, KPIs y modales con colores fijos de modo oscuro

### Changed
- Sistema de temas unificado con variables CSS en `frontend/src/assets/main.css`
- Clases reutilizables: `.data-table`, `.text-themed-muted`, `.text-link`, `.text-cost`, `.modal-overlay`, etc.
- Documentación del sistema de temas en [docs/THEMES.md](docs/THEMES.md)

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

## [1.2.0] - 2026-09-04

### Added
- Toasts y diálogos de confirmación personalizados (sin dependencias npm)
- Tema oscuro, claro y automático (según navegador)
- 2FA con Telegram (códigos por bot) y TOTP con QR (Google Authenticator)
- Login con QR entre dispositivos
- Vista de Seguridad para configurar 2FA

## [1.1.0] - 2026-09-04

### Added
- Rate limiting global con `@nestjs/throttler` (100 req/min por IP por defecto)
- Límite estricto en `POST /api/auth/login` (5 intentos/min)
- Variables de entorno configurables: `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`, `THROTTLE_AUTH_*`

## [1.0.1] - 2026-09-04

### Added
- Componentes `FormField` e `InputMoney` con prefijo USD separado
- CRUD completo de suscripciones (alta, edición, eliminación)
- Edición de costo mensual en cuentas con etiquetas y ayuda contextual
- Vista SQL `v_suscripciones_detalle` incluye `cuenta_id`

[1.2.1]: https://github.com/memo124/control_servicios/releases/tag/v1.2.1
[1.2.0]: https://github.com/memo124/control_servicios/releases/tag/v1.2.0
[1.1.0]: https://github.com/memo124/control_servicios/releases/tag/v1.1.0
[1.0.1]: https://github.com/memo124/control_servicios/releases/tag/v1.0.1
