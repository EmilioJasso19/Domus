import { Test, TestingModule } from '@nestjs/testing';
// expo-server-sdk es ESM-only; la cadena de dependencias lo carga al resolver.
jest.mock('expo-server-sdk', () => ({ Expo: class {} }));
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

describe('TasksController', () => {
  let controller: TasksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
