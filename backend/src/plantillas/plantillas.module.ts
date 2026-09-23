import { Module } from '@nestjs/common';
import { PlantillasService } from './plantillas.service';
import { PlantillasController } from './plantillas.controller';
import { PaymentInfoService } from '../common/payment-info.service';

@Module({
  controllers: [PlantillasController],
  providers: [PlantillasService, PaymentInfoService],
  exports: [PlantillasService, PaymentInfoService],
})
export class PlantillasModule {}
