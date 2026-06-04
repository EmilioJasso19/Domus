import { IsDateString, IsEnum, IsMilitaryTime, IsOptional, IsString } from "class-validator";
import { Days } from "../enums/days.enums";

export class CreateBlockedScheduleDto {
    @IsString()
    home_id!: string;

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
