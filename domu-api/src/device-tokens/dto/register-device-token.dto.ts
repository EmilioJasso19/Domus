import { IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  expo_push_token!: string;

  @IsString()
  @MaxLength(10)
  platform!: string;
}
