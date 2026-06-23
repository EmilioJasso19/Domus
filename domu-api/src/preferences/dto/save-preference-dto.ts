import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class PreferenceItemDto {
  @IsString()
  task_id!: string;

  @IsInt()
  @Min(-1)
  @Max(1)
  score!: number;
}

export class SavePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}