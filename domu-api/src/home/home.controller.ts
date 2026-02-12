import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HomeService } from './home.service';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';

@Controller('homes')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  // TODO: userId should be retrieved from auth token
  @Post(':userId')
  create(@Param('userId') userId: string, @Body() createHomeDto: CreateHomeDto) {
    return this.homeService.create(createHomeDto, userId);
  }

  // @Get()
  // findAll() {
  //   return this.homeService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.homeService.findOne(+id);
  // }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateHomeDto: UpdateHomeDto) {
    return this.homeService.update(id, updateHomeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.homeService.remove(id);
  }
}
