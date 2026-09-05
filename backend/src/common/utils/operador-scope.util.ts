import type { AuthUser } from '../../auth/auth.service';

/** Operadores ven solo cuentas/suscripciones de su titular (nombre = dueno_nombre). Admin ve todo. */
export function operadorDuenoScope(user: AuthUser): string | undefined {
  if (user.roles.includes('admin')) return undefined;
  if (user.roles.includes('operador')) return user.name;
  return undefined;
}
