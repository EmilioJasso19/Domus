import { IsInt, IsNumber, IsString, Max, Min } from "class-validator";

export class CreatePreferenceDto {
    @IsString()
    task_id!: string;

    @IsNumber()
    @IsInt()
    @Min(-1)
    @Max(1)
    score!: number;
}
