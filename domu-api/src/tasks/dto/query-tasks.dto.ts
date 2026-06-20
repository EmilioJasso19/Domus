import { IsString } from 'class-validator';

export class QueryTasksDto {
  // Solo se listan plantillas por hogar. El filtrado accionable por fecha/estado
  // se hace sobre ocurrencias en GET /task-occurrences.
  @IsString()
  home_id!: string;
}
