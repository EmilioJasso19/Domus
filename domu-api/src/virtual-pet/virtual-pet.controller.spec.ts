import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPetController } from './virtual-pet.controller';
import { VirtualPetService } from './virtual-pet.service';

describe('VirtualPetController', () => {
  let controller: VirtualPetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualPetController],
      providers: [{ provide: VirtualPetService, useValue: {} }],
    }).compile();

    controller = module.get<VirtualPetController>(VirtualPetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
