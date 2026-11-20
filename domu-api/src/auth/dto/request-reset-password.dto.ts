import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class RequestResetPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
