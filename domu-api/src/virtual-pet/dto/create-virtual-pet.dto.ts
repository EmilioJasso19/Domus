import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateVirtualPetDto {
    @IsString()
    home_id!: string;
    
    @IsString()
    @MinLength(3, { message: "El nombre debe tener al menos 3 caracteres" })
    @MaxLength(20, { message: "El nombre no puede tener más de 20 caracteres" })
    name!: string;
}
