import {
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsDateString,
  IsEnum,
  Matches,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { FrequencyType } from '../enums/frequency-type.enum';

export class CreateTaskDto {
  @IsString()
  home_id!: string;

  @IsString()
  @MaxLength(100)
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  // Fecha de la primera ocurrencia que se crea junto con la plantilla.
  @IsDateString()
  due_date!: string;

  // Hora opcional de la primera ocurrencia (HH:MM o HH:MM:SS).
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'due_time debe tener formato HH:MM o HH:MM:SS',
  })
  due_time?: string;

  @IsEnum(FrequencyType)
  frequency_type!: FrequencyType;

  // Esfuerzo físico estimado (1 = muy bajo … 5 = muy alto). Pondera el reparto
  // de carga en la asignación automática.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  physical_effort?: number;

  // Solo miembros: si es true, únicamente usuarios con rol MEMBER pueden ser
  // responsables. Si se omite, el backend decide según el hogar (true si hay
  // al menos un MEMBER; false en caso contrario).
  @IsOptional()
  @IsBoolean()
  members_only?: boolean;

  // Responsable inicial opcional. Se asigna a la primera ocurrencia; si se
  // omite, la ocurrencia nace sin asignar (la asigna el algoritmo o el usuario).
  @IsOptional()
  @IsString()
  responsible_id?: string;
}
