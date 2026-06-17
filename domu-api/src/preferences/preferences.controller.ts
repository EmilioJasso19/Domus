import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';
import { User } from '@/users/entities/user.entity';
import { SavePreferencesDto } from './dto/save-preference-dto';

@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) { }

  @Post()
  save(@Body() createPreferenceDto: CreatePreferenceDto, @AuthUser() user) {
    return this.preferencesService.save(createPreferenceDto, user);
  }

  @Post('/many/:homeId')
  saveMany(
    @Body() dto: SavePreferencesDto,
    @Param('homeId') homeId: string,
    @AuthUser() user: User,
  ) {
    return this.preferencesService.saveMany(
      dto,
      homeId,
      user,
    );
  }

  @Get('home/:homeId')
  findAll(@AuthUser() user: User, @Param('homeId') homeId: string) {
    return this.preferencesService.findAllByUserAndHome(user.id, homeId);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.preferencesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePreferenceDto: UpdatePreferenceDto) {
  //   return this.preferencesService.update(+id, updatePreferenceDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.preferencesService.remove(+id);
  // }
}
