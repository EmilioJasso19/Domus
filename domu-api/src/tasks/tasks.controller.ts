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

  @Get()
  findAll(@AuthUser() authUser, @Query() query: QueryTasksDto) {
    return this.tasksService.findAll(authUser, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Get('/user/:userId')
  findAllByUser(
    @Param('userId') userId: string,
  ) {
    return this.tasksService.findAllByUser(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  @Patch(':taskId/assign/:userId')
  assignTaskToUser(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.assignTaskToUser(taskId, userId);
  }

  @Patch(':taskId/assign-random')
  assignTaskToRandomUser(
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.assignTaskToRandomUser(taskId);
  }

  @Patch(':taskId/toggle-completion')
  toggleCompletion(
    @Param('taskId') taskId: string,
    @AuthUser() user: User
  ) {
    return this.tasksService.toggleCompletion(taskId, user.id);
  }
}