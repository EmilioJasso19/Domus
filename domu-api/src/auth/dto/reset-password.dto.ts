import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Matches,
  MaxLength,
} from 'class-validator';

export class ResetPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code!: string;

  // Mismas reglas que CreateUserDto.password.
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  new_password!: string;
}
