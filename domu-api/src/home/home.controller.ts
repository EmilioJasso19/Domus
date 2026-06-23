import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { HomeService } from './home.service';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { JoinHomeDto } from './dto/join-home.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';

@Controller('homes')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Post()
  create(@Body() createHomeDto: CreateHomeDto, @AuthUser() user) {
    return this.homeService.create(createHomeDto, user);
  }

  @Post('join')
  join(@Body() joinHomeDto: JoinHomeDto, @AuthUser() user) {
    return this.homeService.join(joinHomeDto, user);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @AuthUser() user) {
    return this.homeService.leave(id, user);
  }

  @Get('/me')
  findAll(@AuthUser() user) {
    return this.homeService.findAll(user);
  }

  @Get('members/:id')
  findMembers(@Param('id') id: string, @AuthUser() user) {
    return this.homeService.findMembers(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthUser() user) {
    return this.homeService.findOne(id, user);
  }

  @Patch(':homeId/members/:userId/role')
  updateMemberRole(
    @Param('homeId') homeId: string,
    @Param('userId') userId: string,
    @Body('role') role: string,
    @AuthUser() user,
  ) {
    return this.homeService.updateMemberRole(homeId, userId, role, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateHomeDto: UpdateHomeDto,
    @AuthUser() user,
  ) {
    return this.homeService.update(id, updateHomeDto, user);
  }

  @Delete(':homeId/members/:userId')
  expelMember(
    @Param('homeId') homeId: string,
    @Param('userId') userId: string,
    @AuthUser() user,
  ) {
    return this.homeService.expelMember(homeId, userId, user);
  }

  @Post(':id/regenerate-code')
  regenerateCode(@Param('id') id: string, @AuthUser() user) {
    return this.homeService.regenerateCode(id, user);
  }

  @Delete(':id')
  async remove(@AuthUser() user, @Param('id') id: string) {
    return this.homeService.remove(id, user);
  }
}
