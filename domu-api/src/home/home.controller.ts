import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { HomeService } from './home.service';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';

@Controller('homes')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  // TODO: userId should be retrieved from auth token
  @Post()
  create(@Body() createHomeDto: CreateHomeDto, @AuthUser() user) {
    return this.homeService.create(createHomeDto, user);
  }

  @Get()
  findAll(@AuthUser() user) {
    return this.homeService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthUser() user) {
    return this.homeService.findOne(id, user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateHomeDto: UpdateHomeDto, @AuthUser() user) {
    return this.homeService.update(id, updateHomeDto, user);
  }

  @Delete(':id')
  async remove(@AuthUser() user, @Param('id') id: string) {
    return this.homeService.remove(id, user);
  }
}
