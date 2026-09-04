import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.';
}
