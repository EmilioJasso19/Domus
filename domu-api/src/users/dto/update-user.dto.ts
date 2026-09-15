import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Requerida solo cuando se envía `password`, para verificar que quien hace
  // el cambio conoce la contraseña actual.
  @IsOptional()
  @IsString()
  current_password?: string;
}
