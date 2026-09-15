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
import { VirtualPetService } from './virtual-pet.service';
import { CreateVirtualPetDto } from './dto/create-virtual-pet.dto';
import { UpdateVirtualPetDto } from './dto/update-virtual-pet.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';
import { User } from '@/users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('virtual-pet')
export class VirtualPetController {
  constructor(private readonly virtualPetService: VirtualPetService) {}

  @Post()
  create(
    @Body() createVirtualPetDto: CreateVirtualPetDto,
    @AuthUser() authUser: User,
  ) {
    return this.virtualPetService.create(createVirtualPetDto, authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthUser() authUser: User) {
    return this.virtualPetService.findOne(id, authUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVirtualPetDto: UpdateVirtualPetDto,
    @AuthUser() authUser: User,
  ) {
    return this.virtualPetService.update(id, updateVirtualPetDto, authUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AuthUser() authUser: User) {
    return this.virtualPetService.remove(id, authUser);
  }
}
