import { PartialType } from '@nestjs/swagger';
import { CreateBlockedScheduleDto } from './create-blocked-schedule.dto';

export class UpdateBlockedScheduleDto extends PartialType(CreateBlockedScheduleDto) {}
