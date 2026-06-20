import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTaskOccurrenceDto {
  @IsString()
  task_id!: string;

  // Fecha de vencimiento de la ocurrencia (YYYY-MM-DD).
  @IsDateString()
  due_date!: string;

  // Hora de vencimiento opcional (HH:MM o HH:MM:SS). Si se omite, la ocurrencia
  // no tiene hora y no se filtra a nadie por horarios bloqueados recurrentes.
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'due_time debe tener formato HH:MM o HH:MM:SS',
  })
  due_time?: string;
}
