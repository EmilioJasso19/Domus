import { IsIn, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  // Identificador estable de la instalación, generado y persistido en el
  // dispositivo. Es la identidad real del registro; el token solo es un dato.
  @IsString()
  @MaxLength(64)
  device_id!: string;

  @IsString()
  expo_push_token!: string;

  @IsIn(['ios', 'android', 'web'])
  platform!: string;
}
