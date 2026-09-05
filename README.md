# Control Servicios v1.4.1

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
# Editar backend/.env con credenciales reales (DATABASE_URL, JWT_SECRET, etc.)

# Migraciones y seed
npm run db:setup

# Desarrollo (backend + frontend)
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api

## Usuarios y roles

Tras `npm run db:seed` quedan configurados los siguientes usuarios:

| Rol | Email | Contraseña | Alcance |
|-----|-------|------------|---------|
| **Administrador** (full admin) | `admin@controlservicios.local` | `Admin123!` | Todos los permisos: usuarios, plantillas, correos, finanzas, cuentas, clientes, suscripciones |
| **Operador** — Guillermo | `guillermo@controlservicios.local` | `Operador123!` | Familia #1 Spotify, HBO 1, Amazon, Disney+, Crunchyroll |
| **Operador** — Oscar | `oscar@controlservicios.local` | `Operador123!` | Cuentas de **Oscar** |
| **Operador** — Enzo | `enzo@controlservicios.local` | `Operador123!` | Cuentas de **Enzo** |
| **Operador** — Eric | `eric@controlservicios.local` | `Operador123!` | Cuentas de **Eric** |
| **Auditor** | *(crear desde UI con rol auditor)* | — | Solo lectura: suscripciones y finanzas |

### Permisos por rol

| Permiso | Admin | Operador | Auditor |
|---------|:-----:|:--------:|:-------:|
| `suscripciones.ver/crear/editar` | ✓ | ✓ | ver |
| `clientes.gestionar` | ✓ | ✓ | — |
| `cuentas.gestionar` | ✓ | ✓ | — |
| `finanzas.ver` | ✓ | ✓ | ✓ |
| `correos.enviar` | ✓ | — | — |
| `plantillas.editar` | ✓ | — | — |
| `usuarios.gestionar` | ✓ | — | — |

Los operadores **no** pueden acceder a `/usuarios`, `/plantillas` ni disparar notificaciones masivas. El filtro por titular se aplica en el backend (`operadorDuenoScope`) — un operador no puede listar cuentas de otro dueño aunque manipule query params.

> **Nota sobre datos de seed:** Los 20 cupos de Spotify, 4 de HBO/Amazon/Disney+/Crunchyroll y los 18 clientes nombrados provienen de la hoja de control real. Los cupos sin cliente usan el registro **Cupo disponible**.

## Registro de pagos (v1.3.0)

Cada suscripción tiene una **fecha de corte** cuyo **día del mes** define cuándo vence el servicio (ej. día 3 → vence el 3 de cada mes).

### En la UI (Suscripciones)

| Acción | Descripción |
|--------|-------------|
| **+1 mes** | Atajo rápido: avanza la fecha de corte 1 mes conservando el día |
| **Pago / Registrar pago** | Modal para elegir 1, 2, 3, 6 o hasta 24 meses pagados de una vez |
| **Editar → Fecha de corte** | Define o cambia el día de corte inicial |

**Ejemplo:** Corte actual `2026-03-03`, cliente paga 3 meses → nueva fecha `2026-06-03`.

Los meses con menos días ajustan al último día válido (31 ene + 1 mes → 28/29 feb).

### API

```http
POST /api/suscripciones/:id/registrar-pago
Authorization: Bearer <token>
Content-Type: application/json

{ "meses": 3 }
```

Respuesta:

```json
{
  "suscripcionId": 1,
  "mesesPagados": 3,
  "fechaCorteAnterior": "2026-03-03",
  "fechaCorteNueva": "2026-06-03",
  "diaCorte": 3,
  "suscripcion": { ... }
}
```

Requiere permiso `suscripciones.editar`.

## Alertas Telegram a dueños (v1.4.0)

Los **clientes** reciben **correo** (Resend). Los **dueños de cuenta** (Guillermo, Oscar, Enzo, Eric) reciben **Telegram** para saber a quién escribir por WhatsApp/teléfono.

| Canal | Destinatario | Cuándo |
|-------|--------------|--------|
| Correo | Cliente (`cliente.email`) | Vence hoy, en gracia, vencida |
| Telegram | Dueño (`User.name` = `dueno_nombre`) | Mismo criterio, resumen agrupado |

### Configurar (cada dueño/operador)

1. Crear bot con @BotFather → `TELEGRAM_BOT_TOKEN` en `backend/.env`
2. Obtener Chat ID con @userinfobot
3. **Seguridad → Alertas Telegram — Dueño de cuenta** → Chat ID + teléfono (referencia)
4. El nombre del usuario debe coincidir con `dueno_nombre` en cuentas (ej. `Guillermo`)

### Enviar manualmente

**Notificaciones → Telegram a dueños** (o cron diario 6:00 AM con los correos).

```http
POST /api/notificaciones/telegram-duenos/ejecutar
GET  /api/notificaciones/telegram-duenos/pendientes
```

## Resiliencia en el frontend

### Reintento automático de peticiones

El cliente HTTP (`frontend/src/services/api.ts`) reintenta hasta **3 veces** con backoff exponencial (1 s → 2 s → 4 s, máx. 8 s) cuando:

- Hay error de red (`ERR_NETWORK`, timeout)
- El servidor responde **408**, **429**, **502**, **503** o **504**

No reintenta en errores **4xx** de validación ni en **401** (sesión expirada → redirige a `/login`).

### Detección de sin internet

- Escucha eventos `online` / `offline` del navegador (`stores/network.ts`)
- Muestra banner fijo amarillo (`OfflineBanner.vue`) cuando no hay conexión
- Toast de advertencia al detectar fallo de red
- Bloquea nuevas peticiones API mientras `navigator.onLine === false`

### Borradores de formulario

En **Clientes**, **Cuentas** y **Suscripciones**, al crear un registro:

1. Los datos se guardan en `sessionStorage` mientras escribes
2. Si recargas la página y abres **+ Nuevo**, se restaura el borrador con un aviso
3. Si el guardado falla (sin red), el borrador **se conserva** para reintentar
4. Al guardar con éxito, el borrador se elimina

Claves de almacenamiento: `form_draft:clientes-form`, `form_draft:cuentas-form`, `form_draft:suscripciones-form`.

## Seguridad

### Medidas implementadas

| Capa | Protección |
|------|------------|
| Autenticación | JWT Bearer en todas las rutas protegidas |
| Autorización | RBAC con `PermissionsGuard` por endpoint |
| Validación global | `ValidationPipe` con `whitelist`, `forbidNonWhitelisted`, `transform` |
| Rate limiting | `@nestjs/throttler` — 100 req/min global, 5 login/min por IP |
| XSS en UI | Vue escapa interpolaciones (`{{ }}`); no se usa `v-html` |
| SQL injection | Prisma ORM con queries parametrizadas; `ParseIntPipe` en IDs |
| CORS | Restringido a `FRONTEND_URL` |
| 2FA opcional | TOTP y Telegram |

### Rate limiting

| Variable | Default | Descripción |
|----------|---------|-------------|
| `THROTTLE_TTL_MS` | 60000 | Ventana global en ms |
| `THROTTLE_LIMIT` | 100 | Máx. requests por IP en la ventana |
| `THROTTLE_AUTH_LIMIT` | 5 | Máx. intentos de login por IP/min |

Respuesta HTTP **429** con mensaje en español al superar el límite.

### Pruebas de penetración

Script automatizado incluido:

```bash
# Con backend corriendo y BD accesible
npm run test:security

# Contra otra URL
node scripts/security-pentest.mjs http://localhost:3000/api
```

El script valida:

| Categoría | Qué prueba |
|-----------|------------|
| **Tipos inválidos** | Números donde va string, emails malformados, campos extra, IDs no numéricos |
| **XSS / HTML** | `<script>`, `<img onerror>`, SVG onload en campos de texto |
| **SQLi** | `' OR '1'='1`, `DROP TABLE`, `UNION SELECT` en parámetros de ruta |
| **Auth bypass** | Peticiones sin token, token JWT falsificado |
| **RBAC** | Operador bloqueado en `/users`; admin con todos los permisos |
| **Rate limit** | 150 logins + 120 GET concurrentes → espera respuestas **429** |
| **Estrés** | **1000 peticiones simultáneas** a `/clientes` — verifica 0 errores 5xx |

#### Resultados esperados (validación por diseño)

| Prueba | Resultado esperado |
|--------|-------------------|
| Sin token → `/clientes` | **401** Unauthorized |
| Token inválido | **401** |
| ID ruta `abc` o SQLi | **400** (ParseIntPipe) |
| Login con password `null` | **400** (LoginDto + class-validator) |
| 1000 req en ráfaga | Mezcla de **200** + **429**; **0** respuestas 5xx |
| HTML en nombre cliente | Almacenado como texto; Vue no ejecuta scripts en UI |
| Operador → GET `/users` | **403** Forbidden |
| Campos extra en body | **400** en rutas con DTO estricto (`/auth/*`); ver nota abajo |

> **Limitación conocida:** Los endpoints `POST/PATCH` de `clientes`, `cuentas` y `suscripciones` aceptan `Record<string, unknown>` sin DTO dedicado. Prisma rechaza tipos imposibles (p. ej. string en campo numérico de BD), pero conviene añadir DTOs con `class-validator` en una iteración futura para respuestas **400** consistentes antes de tocar la BD.

### Checklist manual recomendado

1. Login con credenciales incorrectas 6 veces → bloqueo temporal (**429**)
2. Crear cliente con nombre `<script>alert(1)</script>` → listado muestra texto literal, sin alerta
3. Abrir formulario de cliente, llenar campos, recargar F5, pulsar **+ Nuevo** → borrador restaurado
4. DevTools → Network → Offline → intentar guardar → banner + toast + borrador intacto
5. Volver online → guardar de nuevo → éxito y borrador limpiado
6. Login como `guillermo@controlservicios.local` → no aparece menú Usuarios ni Plantillas
7. Login como `admin@...` → acceso total

## Estructura del proyecto

```
control_servicios/
├── backend/          # API NestJS
│   ├── prisma/       # Schema, migraciones, seeds, vistas SQL
│   └── src/          # Módulos: auth, suscripciones, finanzas, etc.
├── frontend/         # SPA Vue 3
│   └── src/
│       ├── services/api.ts       # Cliente HTTP con retry
│       ├── stores/network.ts     # Estado online/offline
│       └── composables/useFormDraft.ts
├── scripts/
│   └── security-pentest.mjs      # Pruebas de penetración
└── docker-compose.yml            # Redis
```

## Reglas de negocio

1. **Costos vs ganancias:** El `costo_mensual` pertenece a `cuentas_plataforma` (dueño/titular). La ganancia neta = Σ `precio_cobro` clientes − `costo_mensual` de la cuenta.

2. **Estados dinámicos:** Los estados (`DISPONIBLE`, `VENCE_HOY`, `EN_GRACIA`, `VENCIDA`) se resuelven exclusivamente vía tabla `estados_reglas` y la vista `v_suscripciones_detalle`. No se usa `CASE WHEN` ni lógica hardcodeada en código.

3. **Notificaciones:** Job diario (6:00 AM) que consulta suscripciones en estados críticos, valida preferencias del cliente y encola envíos individuales a Resend.

## API principal

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Autenticación |
| GET | /api/auth/me | Perfil y permisos del usuario actual |
| GET | /api/finanzas/resumen | KPIs financieros globales |
| GET | /api/suscripciones | Listado con estado dinámico |
| PATCH | /api/suscripciones/:id | Actualizar suscripción |
| POST | /api/suscripciones/:id/registrar-pago | Registrar pago y avanzar fecha de corte |
| GET | /api/clientes | CRUD clientes |
| GET | /api/cuentas | Cuentas y dueños |
| GET | /api/plantillas | Plantillas de correo |
| POST | /api/notificaciones/ejecutar | Correo manual a clientes |
| POST | /api/notificaciones/telegram-duenos/ejecutar | Telegram manual a dueños |
| GET | /api/notificaciones/telegram-duenos/pendientes | Dueños con alertas y clientes pendientes |
| POST | /api/auth/alertas-dueno/setup | Configurar Telegram del dueño |
| GET | /api/users | Gestión de usuarios (solo admin) |

## Variables de entorno

Ver `.env.example` para la lista completa.

## Redis con Docker

```bash
docker compose up -d redis
```

## Versionamiento

El historial de versiones se gestiona en la tabla `system_versions` y es visible en la UI en `/version`. Los cambios detallados están en [CHANGELOG.md](CHANGELOG.md).

### Tema claro / oscuro

Ver [docs/THEMES.md](docs/THEMES.md) para el sistema de variables CSS, clases utilitarias y la corrección aplicada en v1.2.1.

Tras actualizar a **v1.4.1** (o desde v1.4.0):

```bash
cd backend
npx prisma migrate deploy
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/changelog-1.4.0.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/changelog-1.4.1.sql
npm run db:seed
```

Actualizar `APP_VERSION="1.4.1"` en `backend/.env`.

Para sincronizar datos de seed (cuentas, clientes, suscripciones):

```bash
npm run db:seed
```

## Licencia

Privado — memo124/control_servicios
