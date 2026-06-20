import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaskOccurrencesService } from './task-occurrences.service';
import { CreateTaskOccurrenceDto } from './dto/create-task-occurrence.dto';
import { UpdateTaskOccurrenceDto } from './dto/update-task-occurrence.dto';
import { QueryTaskOccurrencesDto } from './dto/query-task-occurrences.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';
import { User } from '@/users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('task-occurrences')
export class TaskOccurrencesController {
  constructor(
    private readonly taskOccurrencesService: TaskOccurrencesService,
  ) {}

  @Post()
  create(
    @Body() createTaskOccurrenceDto: CreateTaskOccurrenceDto,
    @AuthUser() user: User,
  ) {
    return this.taskOccurrencesService.create(createTaskOccurrenceDto, user);
  }

  @Get()
  findAll(@Query() query: QueryTaskOccurrencesDto, @AuthUser() user: User) {
    return this.taskOccurrencesService.findAllByHome(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskOccurrencesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskOccurrenceDto: UpdateTaskOccurrenceDto,
    @AuthUser() user: User,
  ) {
    return this.taskOccurrencesService.update(id, updateTaskOccurrenceDto, user);
  }

  @Patch(':id/toggle-completion')
  toggleCompletion(@Param('id') id: string, @AuthUser() user: User) {
    return this.taskOccurrencesService.toggleCompletion(id, user.id);
  }

  @Patch(':id/assign/:userId')
  assignToUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @AuthUser() user: User,
  ) {
    return this.taskOccurrencesService.assignToUser(id, userId, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AuthUser() user: User) {
    return this.taskOccurrencesService.remove(id, user);
  }
}
