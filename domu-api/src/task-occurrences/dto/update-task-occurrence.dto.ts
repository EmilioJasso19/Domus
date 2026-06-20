import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskOccurrenceDto } from './create-task-occurrence.dto';

export class UpdateTaskOccurrenceDto extends PartialType(CreateTaskOccurrenceDto) {}
