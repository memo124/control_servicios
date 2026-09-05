# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.5.0] - 2026-09-05

### Added
- **Plantillas Telegram** editables (`/plantillas-telegram`) con prueba al grupo
- Tabla `plantillas_telegram` y módulo `plantillas-telegram`
- Envío centralizado al **grupo** vía `TELEGRAM_GROUP_CHAT_ID` en `.env`
- `POST /api/auth/telegram/test-group` — mensaje de prueba al grupo
- **Edición de usuarios** (`PATCH /api/users/:id`): nombre, email, rol, teléfono, contraseña, estado
- Campo **teléfono** en gestión de usuarios (referencia de contacto, no Chat ID)

### Changed
- Telegram ya **no guarda Chat ID en BD** — solo bot + grupo en variables de entorno
- Alertas de dueño, 2FA Telegram y pruebas de plantillas van al grupo configurado
- Vista **Seguridad** simplificada (activar alertas por usuario, sin pegar Id)
- Mensajes de error de Telegram más claros (bot vs grupo vs permisos)

## [1.4.1] - 2026-09-05

### Fixed
- Operador Guillermo usa `guillermo@controlservicios.local` en lugar de correo personal en seed, README y pruebas RBAC
- Seed elimina usuario legacy con correo personal si existía en BD

### Changed
- Cliente Melissa en seed: `melissa@email.com` (sin correo personal en datos de ejemplo)

## [1.4.0] - 2026-09-05

### Added
- Alertas **Telegram a dueños de cuenta** (operadores) cuando clientes están en gracia, vencen hoy o están vencidos
- Configuración en **Seguridad → Alertas Telegram — Dueño de cuenta** (Chat ID + teléfono de referencia)
- Endpoints `GET/POST /api/notificaciones/telegram-duenos/*` y cron diario junto al envío de correos
- Tabla `historial_notificaciones_dueno` para auditoría

### Changed
- Vista Notificaciones separa correo (clientes) y Telegram (dueños)

## [1.3.0] - 2026-09-05

### Added
- Registro de pagos en suscripciones: botón **+1 mes** y modal **Registrar pago** (1–24 meses)
- Endpoint `POST /api/suscripciones/:id/registrar-pago` con avance de fecha de corte conservando el día del mes
- Utilidad `addMonthsKeepCutDay` (backend y frontend) con ajuste de fin de mes

### Changed
- Formulario de suscripción: hint sobre día de corte fijo al registrar pagos
- Versión del monorepo, README, seed y SQL de changelog actualizados a 1.3.0

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

[1.5.0]: https://github.com/memo124/control_servicios/releases/tag/v1.5.0
[1.4.1]: https://github.com/memo124/control_servicios/releases/tag/v1.4.1
[1.4.0]: https://github.com/memo124/control_servicios/releases/tag/v1.4.0
[1.3.0]: https://github.com/memo124/control_servicios/releases/tag/v1.3.0
[1.2.1]: https://github.com/memo124/control_servicios/releases/tag/v1.2.1
[1.2.0]: https://github.com/memo124/control_servicios/releases/tag/v1.2.0
[1.1.0]: https://github.com/memo124/control_servicios/releases/tag/v1.1.0
[1.0.1]: https://github.com/memo124/control_servicios/releases/tag/v1.0.1
