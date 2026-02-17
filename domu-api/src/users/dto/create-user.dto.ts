import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
} from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MaxLength(100)
    @MinLength(3)
    name: string;

    @IsString()
    @MaxLength(100)
    paternal_surname: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    maternal_surname?: string;

    @IsEmail()
    @MaxLength(255)
    email: string;

    @IsString()
    @MinLength(8)
    password: string;
}
