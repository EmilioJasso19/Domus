import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';

export class QueryTaskOccurrencesDto {
  @IsString()
  home_id!: string;

  // Filtra por responsable.
  @IsOptional()
  @IsString()
  user_id?: string;

  // 'true' -> completadas (completed_at no nulo); 'false' -> pendientes.
  @IsOptional()
  @IsBooleanString()
  completed?: string;

  // 'today' filtra las ocurrencias cuya due_date es la fecha de hoy.
  @IsOptional()
  @IsIn(['today'])
  date?: string;
}
