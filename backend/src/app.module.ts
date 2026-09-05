import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlataformasModule } from './plataformas/plataformas.module';
import { CuentasModule } from './cuentas/cuentas.module';
import { ClientesModule } from './clientes/clientes.module';
import { SuscripcionesModule } from './suscripciones/suscripciones.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { PlantillasModule } from './plantillas/plantillas.module';
import { PlantillasTelegramModule } from './plantillas-telegram/plantillas-telegram.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { SystemModule } from './system/system.module';
import { EstadosModule } from './estados/estados.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL_MS', 60_000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
          {
            name: 'auth',
            ttl: config.get<number>('THROTTLE_AUTH_TTL_MS', 60_000),
            limit: config.get<number>('THROTTLE_AUTH_LIMIT', 5),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        connectTimeout: 10_000,
        maxRetriesPerRequest: 3,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PlataformasModule,
    CuentasModule,
    ClientesModule,
    SuscripcionesModule,
    FinanzasModule,
    PlantillasModule,
    PlantillasTelegramModule,
    NotificacionesModule,
    SystemModule,
    EstadosModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
