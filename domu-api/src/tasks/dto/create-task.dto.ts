import { IsString, MaxLength, MinLength, IsOptional, IsDateString, IsEnum, Matches } from "class-validator";
import { FrequencyType } from "../enums/frequency-type.enum";

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
}
