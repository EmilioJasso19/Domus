import { IsOptional, IsBooleanString, IsString, IsIn } from 'class-validator';

export class QueryTasksDto {
  @IsString()
  home_id!: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsBooleanString()
  completed?: string;

  @IsOptional()
  @IsIn(['today'])
  date?: string;

  // Sobre qué columna aplica el filtro de fecha.
  // 'completed' -> completed_at (tareas completadas hoy)
  // 'due' -> limit_date (tareas que vencen hoy)
  @IsOptional()
  @IsIn(['completed', 'due'])
  date_field?: 'completed' | 'due';
}