import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RemindersService } from './reminders.service';
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

// due_date muy en el pasado => siempre dentro de la ventana de recordatorio.
const PAST_DATE = '2020-01-01';
// due_date muy en el futuro => aún no es momento de recordar.
const FUTURE_DATE = '2999-01-01';

function makeOccurrence(
  overrides: Partial<TaskOccurrence> = {},
): TaskOccurrence {
  return {
    id: '1',
    task_id: '10',
    user_id: '7',
    due_date: PAST_DATE,
    due_time: null,
    completed_at: null,
    reminder_sent: false,
    created_at: new Date(),
    task: { name: 'Limpiar cocina' },
    ...overrides,
  } as TaskOccurrence;
}

describe('RemindersService', () => {
  let service: RemindersService;
  const repo = { find: jest.fn(), save: jest.fn() };
  const deviceTokens = { findByUserId: jest.fn(), deleteByToken: jest.fn() };
  let sendPush: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.save.mockImplementation((o) => Promise.resolve(o));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: getRepositoryToken(TaskOccurrence), useValue: repo },
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

  // Scenarios 2/3/4/8: filtered out at the query level, never loaded.
  it('queries only pending, un-reminded, assigned, non-deleted occurrences', async () => {
    repo.find.mockResolvedValue([]);
    await service.dispatchDueReminders();

    expect(repo.find).toHaveBeenCalledTimes(1);
    const arg = repo.find.mock.calls[0][0];
    expect(arg.where.reminder_sent).toBe(false);
    expect(arg.where.completed_at).toBeDefined(); // IsNull()
    expect(arg.where.user_id).toBeDefined(); // Not(IsNull())
    expect(arg.where.task).toEqual({ deleted_at: expect.anything() });
    expect(arg.relations).toEqual({ task: true });
    expect(arg.take).toBe(100);
  });

  // Scenario 1
  it('sends a push and marks reminder_sent when due and the user has tokens', async () => {
    const occ = makeOccurrence();
    repo.find.mockResolvedValue([occ]);
    deviceTokens.findByUserId.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
    ]);

    await service.dispatchDueReminders();

    expect(deviceTokens.findByUserId).toHaveBeenCalledWith('7');
    expect(sendPush).toHaveBeenCalledTimes(1);
    const sentMessages = sendPush.mock.calls[0][0];
    expect(sentMessages[0]).toMatchObject({
      to: VALID_TOKEN,
      data: { occurrence_id: '1' },
    });
    expect(occ.reminder_sent).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(occ);
  });

  // Scenario 5
  it('marks reminder_sent without sending when the user has no tokens', async () => {
    const occ = makeOccurrence();
    repo.find.mockResolvedValue([occ]);
    deviceTokens.findByUserId.mockResolvedValue([]);

    await service.dispatchDueReminders();

    expect(sendPush).not.toHaveBeenCalled();
    expect(occ.reminder_sent).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(occ);
  });

  // Scenario 6
  it('deletes a stale token on DeviceNotRegistered and still marks reminder_sent', async () => {
    const occ = makeOccurrence();
    repo.find.mockResolvedValue([occ]);
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
    expect(occ.reminder_sent).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(occ);
  });

  // Scenario 7
  it('skips occurrences whose reminder window has not started yet', async () => {
    const occ = makeOccurrence({ due_date: FUTURE_DATE });
    repo.find.mockResolvedValue([occ]);

    await service.dispatchDueReminders();

    expect(deviceTokens.findByUserId).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(occ.reminder_sent).toBe(false);
  });
});
