import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

@Injectable()
export class QrLoginService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async createSession(): Promise<{ sessionId: string; token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const session = await this.prisma.qrLoginSession.create({
      data: { tokenHash, expiresAt, status: 'pending' },
    });
    return { sessionId: session.id, token, expiresAt };
  }

  async authorizeSession(
    sessionId: string,
    token: string,
    email: string,
    password: string,
  ) {
    const session = await this.prisma.qrLoginSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'pending' || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión QR expirada o inválida');
    }
    const validToken = await bcrypt.compare(token, session.tokenHash);
    if (!validToken) throw new UnauthorizedException('Token QR inválido');

    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    await this.prisma.qrLoginSession.update({
      where: { id: sessionId },
      data: { status: 'authorized', userId: user.id },
    });
    return { success: true };
  }

  async pollSession(sessionId: string, token: string) {
    const session = await this.prisma.qrLoginSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return { status: 'expired' as const };
    }
    const validToken = await bcrypt.compare(token, session.tokenHash);
    if (!validToken) return { status: 'invalid' as const };

    if (session.status === 'authorized' && session.userId) {
      const login = await this.authService.loginByUserId(session.userId);
      await this.prisma.qrLoginSession.update({
        where: { id: sessionId },
        data: { status: 'completed' },
      });
      return { status: 'completed' as const, ...login };
    }
    return { status: session.status as 'pending' | 'authorized' };
  }
}
