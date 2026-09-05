import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { PlantillasTelegramService } from '../plantillas-telegram/plantillas-telegram.service';
import { generateSecret, generateTotp, verifyTotp, buildOtpAuthUrl } from './utils/totp.util';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private telegram: TelegramService,
    private plantillas: PlantillasTelegramService,
  ) {}

  userHas2FA(user: {
    twoFactorEnabled: boolean;
    telegramEnabled: boolean;
    totpEnabled: boolean;
  }): boolean {
    return user.twoFactorEnabled && (user.telegramEnabled || user.totpEnabled);
  }

  getMethods(user: { telegramEnabled: boolean; totpEnabled: boolean }) {
    const methods: string[] = [];
    if (user.telegramEnabled) methods.push('telegram');
    if (user.totpEnabled) methods.push('totp');
    return methods;
  }

  createTempToken(userId: number): string {
    return this.jwt.sign(
      { sub: userId, type: '2fa_pending' },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '10m' },
    );
  }

  verifyTempToken(token: string): number {
    try {
      const payload = this.jwt.verify<{ sub: number; type: string }>(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      if (payload.type !== '2fa_pending') throw new Error('invalid');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Sesión 2FA expirada. Inicia sesión de nuevo.');
    }
  }

  private async storeCode(userId: number, code: string, method: string) {
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.twoFactorCode.create({
      data: { userId, codeHash, method, expiresAt },
    });
  }

  async sendTelegramCode(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.telegramEnabled) {
      throw new BadRequestException('Telegram 2FA no configurado');
    }
    const chatId = this.telegram.getGroupChatId();
    if (!chatId) {
      throw new BadRequestException('TELEGRAM_GROUP_CHAT_ID no configurado en backend/.env');
    }
    const code = crypto.randomInt(100000, 999999).toString();
    await this.storeCode(userId, code, 'telegram');
    const texto = await this.plantillas.render('TELEGRAM_2FA_CODE', {
      code,
      usuario: user.name,
    });
    await this.telegram.sendMessage(chatId, texto);
  }

  async verifyCode(userId: number, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    if (user.totpEnabled && user.totpSecret && verifyTotp(user.totpSecret, code)) {
      return true;
    }

    const records = await this.prisma.twoFactorCode.findMany({
      where: { userId, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const rec of records) {
      if (await bcrypt.compare(code, rec.codeHash)) {
        await this.prisma.twoFactorCode.update({ where: { id: rec.id }, data: { used: true } });
        return true;
      }
    }
    return false;
  }

  async resendTelegram(userId: number) {
    await this.sendTelegramCode(userId);
  }

  async setupTotp(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    const secret = user.totpSecret ?? generateSecret();
    if (!user.totpSecret) {
      await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    }
    return {
      secret,
      otpauthUrl: buildOtpAuthUrl(user.email, secret),
    };
  }

  async confirmTotp(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('Configura TOTP primero');
    if (!verifyTotp(user.totpSecret, code)) {
      throw new BadRequestException('Código TOTP inválido');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  async setupTelegram(userId: number) {
    const chatId = this.telegram.getGroupChatId();
    if (!chatId) {
      throw new BadRequestException('TELEGRAM_GROUP_CHAT_ID no configurado en backend/.env');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramEnabled: true, twoFactorEnabled: true },
    });
    await this.sendTelegramCode(userId);
    return { enabled: true, message: 'Código de prueba enviado al grupo de Telegram' };
  }

  async disable2FA(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        telegramEnabled: false,
        totpEnabled: false,
        totpSecret: null,
      },
    });
  }

  async getStatus(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    return {
      twoFactorEnabled: user.twoFactorEnabled,
      telegramEnabled: user.telegramEnabled,
      totpEnabled: user.totpEnabled,
      telegramConfigured: this.telegram.isConfigured(),
      groupChatConfigured: this.telegram.hasGroupChat(),
    };
  }
}
