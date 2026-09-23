import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

const LIMIT_KEY = 'THROTTLER:LIMIT';
const TTL_KEY = 'THROTTLER:TTL';

/**
 * El módulo define throttlers "default" y "auth". Nest aplica TODOS a cada ruta
 * salvo @SkipThrottle; por eso 5 peticiones en cualquier endpoint bloqueaban la API.
 * Solo aplicamos "auth" donde la ruta declara @Throttle({ auth: ... }).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const original = this.throttlers;

    this.throttlers = original.filter((t) => {
      if (t.name !== 'auth') return true;
      const limit = this.reflector.getAllAndOverride<number | undefined>(
        `${LIMIT_KEY}${t.name}`,
        [handler, classRef],
      );
      const ttl = this.reflector.getAllAndOverride<number | undefined>(
        `${TTL_KEY}${t.name}`,
        [handler, classRef],
      );
      return limit !== undefined || ttl !== undefined;
    });

    try {
      return await super.canActivate(context);
    } finally {
      this.throttlers = original;
    }
  }
}
