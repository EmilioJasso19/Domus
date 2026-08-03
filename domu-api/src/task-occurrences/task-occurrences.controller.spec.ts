import { Test, TestingModule } from '@nestjs/testing';
import { TaskOccurrencesController } from './task-occurrences.controller';
import { TaskOccurrencesService } from './task-occurrences.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

// expo-server-sdk es ESM-only; se mocka porque la cadena de dependencias del
// servicio lo carga al resolver el módulo.
jest.mock('expo-server-sdk', () => ({ Expo: class {} }));

describe('TaskOccurrencesController', () => {
  let controller: TaskOccurrencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskOccurrencesController],
      providers: [{ provide: TaskOccurrencesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskOccurrencesController>(
      TaskOccurrencesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
