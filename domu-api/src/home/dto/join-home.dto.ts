import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class JoinHomeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  invitation_code!: string;
}