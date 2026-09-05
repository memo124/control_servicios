import { IsInt, Max, Min } from 'class-validator';

export class RegistrarPagoDto {
  @IsInt()
  @Min(1)
  @Max(24)
  meses!: number;
}
