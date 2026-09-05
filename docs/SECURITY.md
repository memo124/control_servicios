# Seguridad — Control Servicios

Medidas de seguridad, autenticación, autorización y buenas prácticas. Los **flujos de negocio** (correos, cron, Telegram) están en [FLOWS.md](./FLOWS.md).

---

## Índice

1. [Autenticación](#autenticación)
2. [Autorización (RBAC)](#autorización-rbac)
3. [Segundo factor (2FA)](#segundo-factor-2fa)
4. [Rate limiting](#rate-limiting)
5. [Validación de entrada](#validación-de-entrada)
6. [Protección en capas](#protección-en-capas)
7. [Secretos y variables de entorno](#secretos-y-variables-de-entorno)
8. [Pruebas de penetración](#pruebas-de-penetración)
9. [Checklist manual](#checklist-manual)
10. [Limitaciones conocidas](#limitaciones-conocidas)

---

## Autenticación

### Login estándar

| Paso | Detalle |
|------|---------|
| Endpoint | `POST /api/auth/login` |
| Body | `{ "email", "password" }` |
| Validación | `LoginDto` + bcrypt sobre `users.password_hash` |
| Respuesta OK | `{ access_token, user: { id, name, email, roles, permissions } }` |
| Usuario inactivo | `401 Credenciales inválidas` |
| Token | JWT en header `Authorization: Bearer <token>` |
| Expiración | `JWT_EXPIRES_IN` (default `8h`) |

Archivos: `auth.service.ts`, `jwt.strategy.ts`, `auth.controller.ts`.

### Perfil y sesión

- `GET /api/auth/me` — usuario actual + permisos (requiere JWT)
- Frontend guarda token en `localStorage`; interceptor en `api.ts` adjunta Bearer
- `401` en API → redirección a `/login`

### Login con QR

Flujo para autorizar otro dispositivo:

1. `POST /api/auth/qr/session` → `sessionId`, `token`
2. Dispositivo móvil escanea URL → `POST /api/auth/qr/session/:id/authorize`
3. Origen hace polling → `POST /api/auth/qr/session/:id/poll`

Throttling estricto en authorize (5 intentos/min).

---

## Autorización (RBAC)

### Modelo

```
users ← role_users → roles ← permission_roles → permissions
```

Cada endpoint protegido usa:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('permiso.slug')
```

El guard comprueba que el JWT sea válido y que **alguno** de los permisos listados esté en el usuario.

### Roles y permisos (seed)

| Permiso | Admin | Operador | Auditor |
|---------|:-----:|:--------:|:-------:|
| `suscripciones.ver` | ✓ | ✓ | ✓ |
| `suscripciones.crear` | ✓ | ✓ | — |
| `suscripciones.editar` | ✓ | ✓ | — |
| `suscripciones.eliminar` | ✓ | — | — |
| `clientes.gestionar` | ✓ | ✓ | — |
| `cuentas.gestionar` | ✓ | ✓ | — |
| `finanzas.ver` | ✓ | ✓ | ✓ |
| `correos.enviar` | ✓ | — | — |
| `plantillas.editar` | ✓ | — | — |
| `usuarios.gestionar` | ✓ | — | — |

### Alcance por dueño (operadores)

Además del permiso, los operadores solo ven cuentas/suscripciones cuyo `dueno_nombre` coincide con **`User.name`** (`operadorDuenoScope` en backend). Un operador no puede listar datos de otro titular aunque altere query params.

### Rutas sensibles (admin)

| Ruta UI | Permiso |
|---------|---------|
| `/usuarios` | `usuarios.gestionar` |
| `/plantillas`, `/plantillas-telegram` | `plantillas.editar` |
| `/notificaciones` (ejecutar envíos) | `correos.enviar` |

> El router Vue no bloquea por permiso en todas las rutas; la API responde **403** si falta permiso.

---

## Segundo factor (2FA)

### Métodos soportados

| Método | Configuración | Entrega del código |
|--------|---------------|-------------------|
| **TOTP** | Seguridad → QR (Google Authenticator) | App local |
| **Telegram** | Seguridad → Activar Telegram 2FA | Grupo `TELEGRAM_GROUP_CHAT_ID` |

### Flujo login con 2FA

```
1. POST /auth/login → requiresTwoFactor: true, tempToken (10 min)
2. Si telegramEnabled → TELEGRAM_2FA_CODE al grupo (incluye {{usuario}} y {{code}})
3. POST /auth/2fa/verify { tempToken, code }
4. access_token definitivo
```

Reenvío Telegram: `POST /auth/2fa/resend-telegram` (throttle 3/min).

Códigos almacenados hasheados en `two_factor_codes` (expiran en 5 min, un solo uso).

### Desactivar 2FA

`POST /api/auth/2fa/disable` — limpia flags TOTP/Telegram en el usuario.

---

## Rate limiting

Implementado con `@nestjs/throttler` y `AppThrottlerGuard` global.

| Variable | Default | Ámbito |
|----------|---------|--------|
| `THROTTLE_TTL_MS` | 60000 | Ventana global |
| `THROTTLE_LIMIT` | 100 | Máx. requests/IP/ventana |
| `THROTTLE_AUTH_TTL_MS` | 60000 | Ventana login |
| `THROTTLE_AUTH_LIMIT` | 5 | Máx. logins/IP/min |

Respuesta: **429** con mensaje en español.

Login y 2FA usan perfil `@Throttle({ auth: ... })` más estricto.

---

## Validación de entrada

Pipe global en `main.ts`:

```typescript
new ValidationPipe({
  whitelist: true,           // elimina campos no declarados en DTO
  transform: true,
  forbidNonWhitelisted: true, // 400 si envían campos extra
})
```

Rutas con DTO estricto: `/auth/*`, `/users` (parcial), `/suscripciones/:id/registrar-pago`.

> **Pendiente:** `POST/PATCH` de clientes, cuentas y suscripciones aceptan cuerpos genéricos; Prisma rechaza tipos imposibles pero conviene DTOs dedicados.

---

## Protección en capas

| Capa | Medida |
|------|--------|
| Transporte | HTTPS en producción (reverse proxy) |
| CORS | Solo `FRONTEND_URL` |
| SQL | Prisma parametrizado; IDs con `ParseIntPipe` |
| XSS UI | Vue escapa `{{ }}`; plantillas Telegram preview con cuidado |
| Contraseñas | bcrypt (10 rounds) en registro/seed |
| JWT | Secret en `JWT_SECRET` — cambiar en producción |
| Cola correo | Jobs aislados; reintentos limitados |
| Telegram | Token solo en servidor; destino solo `.env` |

### Telegram — sin Chat ID en base de datos

Desde v1.5.0:

- `TELEGRAM_BOT_TOKEN` — bot @BotFather
- `TELEGRAM_GROUP_CHAT_ID` — único destino para alertas, pruebas y 2FA Telegram

No se persisten chat IDs por usuario (columnas legacy en schema sin uso en flujos nuevos).

---

## Secretos y variables de entorno

| Variable | Secreto | Uso |
|----------|---------|-----|
| `DATABASE_URL` | Sí | PostgreSQL |
| `JWT_SECRET` | **Sí** | Firmar tokens |
| `RESEND_API_KEY` | **Sí** | Envío correo |
| `TELEGRAM_BOT_TOKEN` | **Sí** | Bot API |
| `TELEGRAM_GROUP_CHAT_ID` | No (Id de grupo) | Destino mensajes |
| `MAIL_FROM_ADDRESS` | No | Remitente Resend |
| `REDIS_*` | Depende | Cola BullMQ |

**Nunca** commitear `backend/.env`. Rotar token de Telegram si se expone (@BotFather → revoke).

Plantilla: `.env.example` en la raíz del monorepo.

---

## Pruebas de penetración

Script automatizado:

```bash
npm run test:security
# o
node scripts/security-pentest.mjs http://localhost:3000/api
```

| Categoría | Qué valida |
|-----------|------------|
| Tipos inválidos | DTOs, ParseIntPipe |
| XSS / HTML | Campos de texto almacenados sin ejecutar |
| SQLi | Parámetros de ruta |
| Auth bypass | Sin token, JWT falso |
| RBAC | Operador → 403 en `/users` |
| Rate limit | Ráfagas → 429 |
| Estrés | 1000 req — 0 respuestas 5xx |

Resultados esperados documentados en README (sección resumida).

---

## Checklist manual

1. Login incorrecto 6 veces → **429**
2. XSS en nombre cliente → texto literal en UI
3. Borrador formulario tras F5 (Clientes/Cuentas/Suscripciones)
4. Offline → banner + borrador conservado
5. Operador Guillermo → sin menú Usuarios/Plantillas
6. Admin → acceso total
7. Telegram prueba → mensaje en grupo configurado
8. Notificaciones manual → historial actualizado

---

## Limitaciones conocidas

1. **DTOs incompletos** en algunos CRUD — ver validación de entrada.
2. **2FA Telegram al grupo** — códigos visibles para miembros del grupo; preferir TOTP para cuentas sensibles.
3. **Correo simulado** si Resend no configurado — no falla el job, registra en historial.
4. **Telegram simulado** si token placeholder `xxxx` — retorna `simulated: true`.
5. **Migraciones Prisma** — BD existente puede requerir `db execute` manual (ver README).

---

## Referencias de código

| Tema | Ubicación |
|------|-----------|
| Guards | `backend/src/auth/guards/` |
| Permisos decorator | `backend/src/decorators/permissions.decorator.ts` |
| Throttler | `backend/src/common/guards/app-throttler.guard.ts` |
| 2FA | `backend/src/auth/two-factor.service.ts` |
| Telegram send | `backend/src/auth/telegram.service.ts` |
| Pentest | `scripts/security-pentest.mjs` |
| Resiliencia frontend | `frontend/src/services/api.ts`, `stores/network.ts` |
