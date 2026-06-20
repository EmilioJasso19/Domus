import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';
import { User } from '@/users/entities/user.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { QueryTasksDto } from './dto/query-tasks.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @AuthUser() user: User) {
    return this.tasksService.create(createTaskDto, user);
  }

  // Plantillas del hogar. El listado accionable (por fecha/estado/responsable)
  // se consume desde GET /task-occurrences.
  @Get()
  findAll(@AuthUser() authUser: User, @Query() query: QueryTasksDto) {
    return this.tasksService.findAll(authUser, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
