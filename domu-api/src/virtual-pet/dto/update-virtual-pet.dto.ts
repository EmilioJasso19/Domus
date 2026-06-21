import { OmitType } from '@nestjs/swagger';
import { CreateVirtualPetDto } from './create-virtual-pet.dto';

export class UpdateVirtualPetDto extends OmitType(CreateVirtualPetDto, ['home_id'] as const) {}