import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

export class PreferenceItemDto {
  @IsString()
  task_id!: string;

  @IsInt()
  score!: number;
}

export class SavePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}