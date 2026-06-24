import { IsDateString, IsEnum, IsMilitaryTime, IsOptional, IsString } from "class-validator";
import { Days } from "../enums/days.enums";

export class CreateBlockedScheduleDto {
    @IsString()
    home_id!: string;

    // Opcional: si se envía debe coincidir con el usuario autenticado. No se
    // permite bloquear el horario de otro miembro (se rechaza con 403).
    @IsString()
    @IsOptional()
    user_id?: string;

    @IsEnum(Days)
    day!: Days;

    @IsMilitaryTime()
    start_time!: string;

    @IsMilitaryTime()
    end_time!: string;

    @IsDateString()
    @IsOptional()
    start_date?: string;

    @IsDateString()
    @IsOptional()
    end_date?: string;
}
