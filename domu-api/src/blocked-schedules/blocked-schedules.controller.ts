import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BlockedSchedulesService } from './blocked-schedules.service';
import { CreateBlockedScheduleDto } from './dto/create-blocked-schedule.dto';
import { UpdateBlockedScheduleDto } from './dto/update-blocked-schedule.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';

@UseGuards(JwtAuthGuard)
@Controller('schedules')
export class BlockedSchedulesController {
  constructor(private readonly schedulesService: BlockedSchedulesService) {}

  @Post()
  create(@Body() createBlockedScheduleDto: CreateBlockedScheduleDto, @AuthUser() user) {
    return this.schedulesService.create(createBlockedScheduleDto, user);
  }

  @Get()
  findAll(@AuthUser() user) {
    return this.schedulesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthUser() user) {
    return this.schedulesService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlockedScheduleDto: UpdateBlockedScheduleDto, @AuthUser() user) {
    return this.schedulesService.update(id, updateBlockedScheduleDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AuthUser() user) {
    return this.schedulesService.remove(id, user);
  }
}
