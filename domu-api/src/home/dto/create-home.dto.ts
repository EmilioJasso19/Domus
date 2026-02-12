import { IsString } from "class-validator";

export class CreateHomeDto {
    @IsString()
    name: string;
}
