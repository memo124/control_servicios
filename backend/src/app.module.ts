import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlataformasModule } from './plataformas/plataformas.module';
import { CuentasModule } from './cuentas/cuentas.module';
import { ClientesModule } from './clientes/clientes.module';
import { SuscripcionesModule } from './suscripciones/suscripciones.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { PlantillasModule } from './plantillas/plantillas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { SystemModule } from './system/system.module';
import { EstadosModule } from './estados/estados.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
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
    NotificacionesModule,
    SystemModule,
    EstadosModule,
  ],
})
export class AppModule {}
