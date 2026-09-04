import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/auth.dto';
import { TwoFactorService } from './two-factor.service';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private twoFactor: TwoFactorService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user || user.status !== 'active') return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return this.mapUser(user);
  }

  async login(dto: LoginDto) {
    const dbUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!dbUser || dbUser.status !== 'active') {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await bcrypt.compare(dto.password, dbUser.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    if (this.twoFactor.userHas2FA(dbUser)) {
      const tempToken = this.twoFactor.createTempToken(dbUser.id);
      if (dbUser.telegramEnabled) {
        await this.twoFactor.sendTelegramCode(dbUser.id);
      }
      return {
        requiresTwoFactor: true,
        tempToken,
        methods: this.twoFactor.getMethods(dbUser),
      };
    }

    const user = await this.getProfile(dbUser.id);
    return this.issueToken(user);
  }

  async loginByUserId(userId: number) {
    const user = await this.getProfile(userId);
    return this.issueToken(user);
  }

  async verifyTwoFactor(tempToken: string, code: string) {
    const userId = this.twoFactor.verifyTempToken(tempToken);
    const valid = await this.twoFactor.verifyCode(userId, code);
    if (!valid) throw new UnauthorizedException('Código 2FA inválido');
    const user = await this.getProfile(userId);
    return this.issueToken(user);
  }

  issueToken(user: AuthUser) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    });
    return { access_token: token, user };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return this.mapUser(user);
  }

  private mapUser(user: {
    id: number;
    name: string;
    email: string;
    roles: Array<{
      role: {
        slug: string;
        permissions: Array<{ permission: { slug: string } }>;
      };
    }>;
  }): AuthUser {
    const roles = user.roles.map((r) => r.role.slug);
    const permissions = [
      ...new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission.slug),
        ),
      ),
    ];
    return { id: user.id, name: user.name, email: user.email, roles, permissions };
  }
}
