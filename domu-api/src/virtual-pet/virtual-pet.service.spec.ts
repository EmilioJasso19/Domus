import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPetService } from './virtual-pet.service';

describe('VirtualPetService', () => {
  let service: VirtualPetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VirtualPetService],
    }).compile();

    service = module.get<VirtualPetService>(VirtualPetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
