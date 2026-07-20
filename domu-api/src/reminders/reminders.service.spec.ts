import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RemindersService } from './reminders.service';
import { Reminder } from './entities/reminders.entity';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';
import { DeviceTokensService } from '@/device-tokens/device-tokens.service';

// expo-server-sdk v6 is ESM-only; mock it so Jest's runtime doesn't try to load
// it (and so we can assert on the network send). chunkPushNotifications keeps a
// simple single-chunk behavior; sendPushNotificationsAsync is overridden per-test.
jest.mock('expo-server-sdk', () => {
  class Expo {
    static isExpoPushToken(token: unknown): boolean {
      return typeof token === 'string' && token.startsWith('ExponentPushToken[');
    }
    chunkPushNotifications(messages: unknown[]): unknown[][] {
      return [messages];
    }
    sendPushNotificationsAsync = jest.fn();
  }
  return { Expo };
});

const VALID_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
const PAST_DATE = '2020-01-01';

// Un recordatorio ya vencido, cuya ocurrencia sigue vigente. El filtrado por
// ventana (date_time <= now), asignación y completado vive en el WHERE de la
// query, así que el servicio envía todo lo que find() devuelve.
function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 100,
    date_time: new Date(`${PAST_DATE}T00:00:00Z`),
    reminder_sent: false,
    occurrence: {
      id: '1',
      user_id: '7',
      due_date: PAST_DATE,
      due_time: null,
      completed_at: null,
      task: { name: 'Limpiar cocina' },
    },
    ...overrides,
  } as Reminder;
}

describe('RemindersService', () => {
  let service: RemindersService;
  const qb = {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };
  const repo = {
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const deviceTokens = { findByUserId: jest.fn(), deleteByToken: jest.fn() };
  let sendPush: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.save.mockImplementation((o) => Promise.resolve(o));
    repo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: getRepositoryToken(Reminder), useValue: repo },
        { provide: DeviceTokensService, useValue: deviceTokens },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);

    // Stub del envío de red de Expo (chunkPushNotifications se deja real).
    sendPush = jest.fn().mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]);
    (service as any).expo.sendPushNotificationsAsync = sendPush;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queries only due, un-sent reminders of active, assigned, non-deleted occurrences', async () => {
    repo.find.mockResolvedValue([]);
    await service.dispatchDueReminders();

    expect(repo.find).toHaveBeenCalledTimes(1);
    const arg = repo.find.mock.calls[0][0];
    expect(arg.where.reminder_sent).toBe(false);
    expect(arg.where.date_time).toBeDefined(); // LessThanOrEqual(now)
    expect(arg.where.occurrence.user_id).toBeDefined(); // Not(IsNull())
    expect(arg.where.occurrence.completed_at).toBeDefined(); // IsNull()
    expect(arg.where.occurrence.task).toEqual({ deleted_at: expect.anything() });
    expect(arg.relations).toEqual({ occurrence: { task: true } });
    expect(arg.order).toEqual({ date_time: 'ASC' });
    expect(arg.take).toBe(100);
  });

  it('sends a high-priority push and marks the reminder sent when the user has tokens', async () => {
    const reminder = makeReminder();
    repo.find.mockResolvedValue([reminder]);
    deviceTokens.findByUserId.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
    ]);

    await service.dispatchDueReminders();

    expect(deviceTokens.findByUserId).toHaveBeenCalledWith('7');
    expect(sendPush).toHaveBeenCalledTimes(1);
    const sentMessages = sendPush.mock.calls[0][0];
    expect(sentMessages[0]).toMatchObject({
      to: VALID_TOKEN,
      priority: 'high',
      channelId: 'reminders',
      data: { occurrence_id: '1' }, // occurrence id, not reminder id
    });
    expect(reminder.reminder_sent).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(reminder);
  });

  it('marks the reminder sent without sending when the user has no tokens', async () => {
    const reminder = makeReminder();
    repo.find.mockResolvedValue([reminder]);
    deviceTokens.findByUserId.mockResolvedValue([]);

    await service.dispatchDueReminders();

    expect(sendPush).not.toHaveBeenCalled();
    expect(reminder.reminder_sent).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(reminder);
  });

  it('deletes a stale token on DeviceNotRegistered and still marks the reminder sent', async () => {
    const reminder = makeReminder();
    repo.find.mockResolvedValue([reminder]);
    deviceTokens.findByUserId.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
    ]);
    sendPush.mockResolvedValue([
      {
        status: 'error',
        message: 'not registered',
        details: { error: 'DeviceNotRegistered' },
      },
    ]);

    await service.dispatchDueReminders();

    expect(deviceTokens.deleteByToken).toHaveBeenCalledWith(VALID_TOKEN);
    expect(reminder.reminder_sent).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(reminder);
  });

  describe('scheduleForOccurrence', () => {
    it('replaces reminders with 1h-before and at-due when the occurrence has a due_time', async () => {
      const occ = {
        id: '1',
        due_date: '2020-01-01',
        due_time: '10:00:00',
      } as TaskOccurrence;

      await service.scheduleForOccurrence(occ);

      // borra los existentes por occurrence_id antes de recrear
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('occurrence_id = :id', { id: '1' });

      const saved = repo.save.mock.calls[0][0] as Reminder[];
      expect(saved).toHaveLength(2);
      // APP_TIMEZONE por defecto es UTC en tests
      expect((saved[0].date_time as Date).toISOString()).toBe(
        '2020-01-01T09:00:00.000Z',
      );
      expect((saved[1].date_time as Date).toISOString()).toBe(
        '2020-01-01T10:00:00.000Z',
      );
      expect(saved.every((r) => r.reminder_sent === false)).toBe(true);
    });

    it('schedules reminders at 12:00 and 23:00 when the occurrence has no due_time', async () => {
      const occ = {
        id: '1',
        due_date: '2020-01-01',
        due_time: null,
      } as TaskOccurrence;

      await service.scheduleForOccurrence(occ);

      const saved = repo.save.mock.calls[0][0] as Reminder[];
      expect(saved).toHaveLength(2);
      expect((saved[0].date_time as Date).toISOString()).toBe(
        '2020-01-01T12:00:00.000Z',
      );
      expect((saved[1].date_time as Date).toISOString()).toBe(
        '2020-01-01T23:00:00.000Z',
      );
    });
  });
});
