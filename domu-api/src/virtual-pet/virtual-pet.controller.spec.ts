import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPetController } from './virtual-pet.controller';
import { VirtualPetService } from './virtual-pet.service';

const mockAuthUser: any = { id: '1', email: 'emilio@example.com' };

const mockVirtualPetService = {
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('VirtualPetController', () => {
  let controller: VirtualPetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualPetController],
      providers: [
        { provide: VirtualPetService, useValue: mockVirtualPetService },
      ],
    }).compile();

    controller = module.get<VirtualPetController>(VirtualPetController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create pasa @AuthUser() al service', async () => {
    const dto: any = { home_id: '100', name: 'Firulais' };
    mockVirtualPetService.create.mockResolvedValue({});

    await controller.create(dto, mockAuthUser);

    expect(mockVirtualPetService.create).toHaveBeenCalledWith(
      dto,
      mockAuthUser,
    );
  });

  it('findOne pasa @AuthUser() al service', async () => {
    mockVirtualPetService.findOne.mockResolvedValue({});

    await controller.findOne('100', mockAuthUser);

    expect(mockVirtualPetService.findOne).toHaveBeenCalledWith(
      '100',
      mockAuthUser,
    );
  });
});
