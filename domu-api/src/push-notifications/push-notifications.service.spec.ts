import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationsService } from './push-notifications.service';
import { DeviceTokensService } from '@/device-tokens/device-tokens.service';

// expo-server-sdk v6 es ESM-only; se mockea para que el runtime de Jest no
// intente cargarlo y para poder asertar sobre el envío de red.
jest.mock('expo-server-sdk', () => {
  class Expo {
    static isExpoPushToken(token: unknown): boolean {
      return (
        typeof token === 'string' && token.startsWith('ExponentPushToken[')
      );
    }
    chunkPushNotifications(messages: unknown[]): unknown[][] {
      return [messages];
    }
    sendPushNotificationsAsync = jest.fn();
  }
  return { Expo };
});

const VALID_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
const OTHER_TOKEN = 'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]';
const payload = {
  title: 'Título',
  body: 'Cuerpo',
  channelId: 'tasks',
  data: { occurrence_id: '1' },
};

describe('PushNotificationsService', () => {
  let service: PushNotificationsService;
  const deviceTokens = {
    findByUserIds: jest.fn(),
    deleteByToken: jest.fn(),
    markSuccess: jest.fn(),
  };
  let sendPush: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationsService,
        { provide: DeviceTokensService, useValue: deviceTokens },
      ],
    }).compile();

    service = module.get<PushNotificationsService>(PushNotificationsService);

    // Stub del envío de red de Expo (chunkPushNotifications se deja real).
    sendPush = jest.fn().mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]);
    (service as any).expo.sendPushNotificationsAsync = sendPush;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('envía un push de alta prioridad al token válido del usuario', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
    ]);

    await service.sendToUser('7', payload);

    expect(deviceTokens.findByUserIds).toHaveBeenCalledWith(['7']);
    expect(sendPush).toHaveBeenCalledTimes(1);
    expect(sendPush.mock.calls[0][0][0]).toMatchObject({
      to: VALID_TOKEN,
      priority: 'high',
      channelId: 'tasks',
      title: 'Título',
      body: 'Cuerpo',
      data: { occurrence_id: '1' },
    });
  });

  it('resuelve todos los destinatarios en una sola consulta', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
      { expo_push_token: OTHER_TOKEN },
    ]);

    await service.sendToUsers(['7', '8'], payload);

    expect(deviceTokens.findByUserIds).toHaveBeenCalledTimes(1);
    expect(deviceTokens.findByUserIds).toHaveBeenCalledWith(['7', '8']);
    expect(sendPush.mock.calls[0][0]).toHaveLength(2);
  });

  it('deduplica destinatarios y tokens repetidos', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
      { expo_push_token: VALID_TOKEN },
    ]);

    await service.sendToUsers(['7', '7'], payload);

    expect(deviceTokens.findByUserIds).toHaveBeenCalledWith(['7']);
    expect(sendPush.mock.calls[0][0]).toHaveLength(1);
  });

  it('no envía nada si el usuario no tiene tokens', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([]);

    await service.sendToUser('7', payload);

    expect(sendPush).not.toHaveBeenCalled();
  });

  it('ignora los tokens que no son de Expo', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([
      { expo_push_token: 'not-an-expo-token' },
    ]);

    await service.sendToUser('7', payload);

    expect(sendPush).not.toHaveBeenCalled();
  });

  it('borra un token obsoleto en DeviceNotRegistered', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
    ]);
    sendPush.mockResolvedValueOnce([
      {
        status: 'error',
        message: 'not registered',
        details: { error: 'DeviceNotRegistered' },
      },
    ]);

    await service.sendToUser('7', payload);

    expect(deviceTokens.deleteByToken).toHaveBeenCalledWith(VALID_TOKEN);
    expect(deviceTokens.markSuccess).toHaveBeenCalledWith([]);
  });

  it('sella last_success_at en los tickets aceptados', async () => {
    deviceTokens.findByUserIds.mockResolvedValue([
      { expo_push_token: VALID_TOKEN },
      { expo_push_token: OTHER_TOKEN },
    ]);
    sendPush.mockResolvedValueOnce([
      { status: 'ok', id: 'ticket-1' },
      {
        status: 'error',
        message: 'not registered',
        details: { error: 'DeviceNotRegistered' },
      },
    ]);

    await service.sendToUsers(['7', '8'], payload);

    expect(deviceTokens.markSuccess).toHaveBeenCalledWith([VALID_TOKEN]);
    expect(deviceTokens.deleteByToken).toHaveBeenCalledWith(OTHER_TOKEN);
    expect(deviceTokens.deleteByToken).toHaveBeenCalledTimes(1);
  });
});
