import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';
import { Home } from '@/home/entities/home.entity';
import { Task } from '@/tasks/entities/task.entity';
import { DeviceTokens } from '@/device-tokens/entities/device-tokens.entity';
import { RoleName } from '@/role/constants/roles.constants';

jest.mock('argon2');

const mockUser: any = {
  id: '1',
  email: 'emilio@example.com',
  name: 'Emilio',
  paternal_surname: 'Jasso',
  maternal_surname: 'Lopez',
  password: 'hashed-current-password',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockUsersRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// EntityManager expuesto dentro de DataSource.transaction(cb).
const mockEntityManager = {
  find: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: any) => cb(mockEntityManager)),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMe', () => {
    it('retorna el perfil del usuario sin el campo password', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue({ ...mockUser });

      const result = await service.findMe('1');

      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ id: '1', email: 'emilio@example.com' });
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findMe('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMe', () => {
    it('actualiza campos no sensibles sin requerir current_password', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUsersRepository.update.mockResolvedValue({ affected: 1 });
      mockUsersRepository.findOneBy.mockResolvedValue({
        ...mockUser,
        name: 'Nuevo Nombre',
      });

      const dto = { name: 'Nuevo Nombre' } as any;
      await service.updateMe('1', dto);

      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ name: 'Nuevo Nombre' }),
      );
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('verifica current_password y hashea la nueva password cuando coincide', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUsersRepository.update.mockResolvedValue({ affected: 1 });
      mockUsersRepository.findOneBy.mockResolvedValue({ ...mockUser });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-new-password');

      const dto = {
        password: 'NewPassword123!',
        current_password: 'OldPassword123!',
      } as any;
      await service.updateMe('1', dto);

      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.password,
        'OldPassword123!',
      );
      expect(argon2.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ password: 'hashed-new-password' }),
      );
      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        '1',
        expect.not.objectContaining({ current_password: expect.anything() }),
      );
    });

    it('lanza BadRequestException si current_password es incorrecta', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ ...mockUser });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const dto = {
        password: 'NewPassword123!',
        current_password: 'WrongPassword!',
      } as any;

      await expect(service.updateMe('1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersRepository.update).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si envía password sin current_password', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ ...mockUser });

      const dto = { password: 'NewPassword123!' } as any;

      await expect(service.updateMe('1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(argon2.verify).not.toHaveBeenCalled();
      expect(mockUsersRepository.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMe('999', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMe', () => {
    const memberRole: any = { id: '20', name: RoleName.MEMBER };
    const ownerRole: any = { id: '10', name: RoleName.OWNER };

    beforeEach(() => {
      mockUsersRepository.findOneBy.mockResolvedValue({ ...mockUser });
      mockEntityManager.find.mockResolvedValue([]);
      mockEntityManager.delete.mockResolvedValue({ affected: 1 });
      mockEntityManager.update.mockResolvedValue({ affected: 1 });
      mockEntityManager.save.mockResolvedValue({});
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(service.removeMe('999')).rejects.toThrow(NotFoundException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('ejecuta todo dentro de dataSource.transaction()', async () => {
      await service.removeMe('1');

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('anonimiza los datos del usuario sin borrar la fila', async () => {
      await service.removeMe('1');

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        User,
        '1',
        expect.objectContaining({
          name: expect.any(String),
          email: expect.stringContaining('1'),
        }),
      );
      const [, , anonymized] = mockEntityManager.update.mock.calls.find(
        (call: any[]) => call[0] === User,
      );
      expect(anonymized.email).not.toBe(mockUser.email);
      expect(anonymized.name).not.toBe(mockUser.name);
    });

    it('elimina los device tokens del usuario', async () => {
      await service.removeMe('1');

      expect(mockEntityManager.delete).toHaveBeenCalledWith(DeviceTokens, {
        user_id: '1',
      });
    });

    it('remueve la membresía en un hogar donde el usuario no es el único OWNER', async () => {
      mockEntityManager.find.mockImplementation((entity: any, opts: any) => {
        if (entity === UserHomeRole && opts?.where?.user_id === '1') {
          return Promise.resolve([
            {
              user_id: '1',
              home_id: '100',
              role_id: memberRole.id,
              role: memberRole,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      await service.removeMe('1');

      expect(mockEntityManager.delete).toHaveBeenCalledWith(UserHomeRole, {
        user_id: '1',
      });
      expect(mockEntityManager.save).not.toHaveBeenCalled();
      expect(mockEntityManager.delete).not.toHaveBeenCalledWith(
        Home,
        expect.anything(),
      );
    });

    it('si hay otro OWNER en el hogar, no transfiere el rol, solo remueve la membresía', async () => {
      mockEntityManager.find.mockImplementation((entity: any, opts: any) => {
        if (entity === UserHomeRole && opts?.where?.user_id === '1') {
          return Promise.resolve([
            {
              user_id: '1',
              home_id: '100',
              role_id: ownerRole.id,
              role: ownerRole,
            },
          ]);
        }
        if (
          entity === UserHomeRole &&
          opts?.where?.home_id === '100' &&
          opts?.where?.role_id === ownerRole.id
        ) {
          // dos OWNERs en el hogar: el que se va y otro más
          return Promise.resolve([{}, {}]);
        }
        return Promise.resolve([]);
      });

      await service.removeMe('1');

      expect(mockEntityManager.save).not.toHaveBeenCalled();
      expect(mockEntityManager.delete).toHaveBeenCalledWith(UserHomeRole, {
        user_id: '1',
      });
      expect(mockEntityManager.delete).not.toHaveBeenCalledWith(
        Home,
        expect.anything(),
      );
    });

    it('si es único OWNER y hay más miembros, transfiere el rol al de joined_at más antiguo', async () => {
      // Mismo día, distinto instante: joined_at debe ser timestamptz para que
      // el desempate no dependa de la fecha sino del momento exacto.
      const oldestMember = {
        user_id: '2',
        home_id: '100',
        joined_at: new Date('2024-01-01T08:00:00.000Z'),
      };
      const newestMember = {
        user_id: '3',
        home_id: '100',
        joined_at: new Date('2024-01-01T20:00:00.000Z'),
      };

      mockEntityManager.find.mockImplementation((entity: any, opts: any) => {
        if (entity === UserHomeRole && opts?.where?.user_id === '1') {
          return Promise.resolve([
            {
              user_id: '1',
              home_id: '100',
              role_id: ownerRole.id,
              role: ownerRole,
            },
          ]);
        }
        if (
          entity === UserHomeRole &&
          opts?.where?.home_id === '100' &&
          opts?.where?.role_id === ownerRole.id
        ) {
          // único OWNER: solo el que se va
          return Promise.resolve([{ user_id: '1' }]);
        }
        if (
          entity === UserHomeRole &&
          opts?.where?.home_id === '100' &&
          !opts?.where?.role_id
        ) {
          return Promise.resolve([oldestMember, newestMember]);
        }
        return Promise.resolve([]);
      });

      await service.removeMe('1');

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: '2', role_id: ownerRole.id }),
      );
      expect(mockEntityManager.delete).not.toHaveBeenCalledWith(
        Home,
        expect.anything(),
      );
    });

    it('si es el único miembro del hogar, borra las tasks y el hogar completo', async () => {
      mockEntityManager.find.mockImplementation((entity: any, opts: any) => {
        if (entity === UserHomeRole && opts?.where?.user_id === '1') {
          return Promise.resolve([
            {
              user_id: '1',
              home_id: '100',
              role_id: ownerRole.id,
              role: ownerRole,
            },
          ]);
        }
        if (
          entity === UserHomeRole &&
          opts?.where?.home_id === '100' &&
          opts?.where?.role_id === ownerRole.id
        ) {
          return Promise.resolve([{ user_id: '1' }]);
        }
        if (
          entity === UserHomeRole &&
          opts?.where?.home_id === '100' &&
          !opts?.where?.role_id
        ) {
          // único miembro del hogar: nadie más
          return Promise.resolve([{ user_id: '1' }]);
        }
        return Promise.resolve([]);
      });

      await service.removeMe('1');

      expect(mockEntityManager.delete).toHaveBeenCalledWith(Task, {
        home_id: '100',
      });
      expect(mockEntityManager.delete).toHaveBeenCalledWith(Home, {
        id: '100',
      });
    });

    it('propaga el error si algo falla a mitad de la transacción', async () => {
      mockEntityManager.delete.mockRejectedValueOnce(new Error('DB explotó'));

      await expect(service.removeMe('1')).rejects.toThrow('DB explotó');
    });
  });

  describe('findByEmail', () => {
    it('no retorna un usuario cuyo email ya fue anonimizado', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toBeNull();
    });
  });
});
