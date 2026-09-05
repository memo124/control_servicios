import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { TwoFactorService } from './two-factor.service';
import { AlertasDuenoService } from './alertas-dueno.service';
import { QrLoginService } from './qr-login.service';
import { TelegramModule } from '../telegram/telegram.module';
import { PlantillasTelegramModule } from '../plantillas-telegram/plantillas-telegram.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TelegramModule,
    PlantillasTelegramModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'change-me',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '8h') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TwoFactorService, QrLoginService, AlertasDuenoService],
  exports: [AuthService, TwoFactorService, TelegramModule],
})
export class AuthModule {}
