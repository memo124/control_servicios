import { Module } from '@nestjs/common';
import { PlataformasService } from './plataformas.service';
import { PlataformasController } from './plataformas.controller';

@Module({
  controllers: [PlataformasController],
  providers: [PlataformasService],
})
export class PlataformasModule {}
