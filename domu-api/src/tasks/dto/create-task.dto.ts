import { IsString, MaxLength, MinLength, IsOptional, IsDateString, IsEnum, IsBoolean } from "class-validator";
import { FrequencyType } from "../enums/frequency-type.enum";

export class CreateTaskDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @MinLength(3)
    description?: string;

    @IsDateString()
    due_date: string;

    @IsEnum(FrequencyType)
    frequency_type: FrequencyType;

    @IsBoolean()
    @IsOptional()
    is_completed?: boolean;

    @IsBoolean()
    @IsOptional()
    is_strict?: boolean;
}
