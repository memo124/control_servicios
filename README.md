# Control Servicios v1.2.1

Plataforma full-stack para administración de suscripciones de streaming, control financiero de ganancias y envío de avisos de cobro por correo electrónico.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | NestJS + TypeScript + Prisma |
| Frontend | Vue 3 (Composition API) + Vite + Tailwind CSS + Pinia |
| Base de datos | PostgreSQL |
| Colas | BullMQ + Redis |
| Email | Resend SDK |

## Requisitos

- Node.js >= 20
- PostgreSQL 14+
- Redis (para colas de correo)

## Instalación

```bash
# Clonar e instalar dependencias
cd control_servicios
npm install

# Configurar variables de entorno
cp .env.example backend/.env
# Editar backend/.env con credenciales reales

# Migraciones y seed
npm run db:setup

# Desarrollo (backend + frontend)
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email | admin@controlservicios.local |
| Password | Admin123! |

## Estructura del proyecto

```
control_servicios/
├── backend/          # API NestJS
│   ├── prisma/       # Schema, migraciones, seeds, vistas SQL
│   └── src/          # Módulos: auth, suscripciones, finanzas, etc.
├── frontend/         # SPA Vue 3
└── docker-compose.yml
```

## Reglas de negocio

1. **Costos vs ganancias:** El `costo_mensual` pertenece a `cuentas_plataforma` (dueño/titular). La ganancia neta = Σ `precio_cobro` clientes − `costo_mensual` de la cuenta.

2. **Estados dinámicos:** Los estados (`DISPONIBLE`, `VENCE_HOY`, `EN_GRACIA`, `VENCIDA`) se resuelven exclusivamente vía tabla `estados_reglas` y la vista `v_suscripciones_detalle`. No se usa `CASE WHEN` ni lógica hardcodeada en código.

3. **Notificaciones:** Job diario (6:00 AM) que consulta suscripciones en estados críticos, valida preferencias del cliente y encola envíos individuales a Resend.

## API principal

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Autenticación |
| GET | /api/finanzas/resumen | KPIs financieros globales |
| GET | /api/suscripciones | Listado con estado dinámico |
| GET | /api/clientes | CRUD clientes |
| GET | /api/cuentas | Cuentas y dueños |
| GET | /api/plantillas | Plantillas de correo |
| POST | /api/notificaciones/ejecutar | Disparo manual de notificaciones |

## Variables de entorno

Ver `.env.example` para la lista completa.

### Rate limiting

| Variable | Default | Descripción |
|----------|---------|-------------|
| `THROTTLE_TTL_MS` | 60000 | Ventana global en ms |
| `THROTTLE_LIMIT` | 100 | Máx. requests por IP en la ventana |
| `THROTTLE_AUTH_LIMIT` | 5 | Máx. intentos de login por IP/min |

Respuesta HTTP **429** con mensaje en español al superar el límite.

## Redis con Docker

```bash
docker compose up -d redis
```

## Versionamiento

El historial de versiones se gestiona en la tabla `system_versions` y es visible en la UI en `/version`. Los cambios detallados están en [CHANGELOG.md](CHANGELOG.md).

### Tema claro / oscuro

Ver [docs/THEMES.md](docs/THEMES.md) para el sistema de variables CSS, clases utilitarias y la corrección aplicada en v1.2.1.

Tras actualizar a v1.2.1, registrar el changelog en BD (si aún no existe):

```bash
cd backend
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/changelog-1.2.1.sql
```

Actualizar `APP_VERSION="1.2.1"` en `backend/.env`.

## Licencia

Privado — memo124/control_servicios
