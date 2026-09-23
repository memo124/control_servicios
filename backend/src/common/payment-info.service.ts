import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Variables de depósito / comprobante inyectadas en plantillas de correo (desde .env). */
@Injectable()
export class PaymentInfoService {
  constructor(private config: ConfigService) {}

  getTemplateVariables(): Record<string, string> {
    return {
      pago_banco: this.config.get<string>('PAYMENT_BANK_NAME')?.trim() ?? '',
      pago_cuenta: this.config.get<string>('PAYMENT_BANK_ACCOUNT')?.trim() ?? '',
      pago_titular: this.config.get<string>('PAYMENT_ACCOUNT_HOLDER')?.trim() ?? '',
      pago_correo_comprobante: this.config.get<string>('PAYMENT_PROOF_EMAIL')?.trim() ?? '',
      pago_telefono_comprobante: this.config.get<string>('PAYMENT_PROOF_PHONE')?.trim() ?? '',
    };
  }
}
