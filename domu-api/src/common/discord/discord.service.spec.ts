import { DiscordService } from './discord.service';

const WEBHOOK_URL = 'https://discord.com/api/webhooks/123/abc';

describe('DiscordService', () => {
  let service: DiscordService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new DiscordService();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchMock as any;
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it('is a no-op when no webhook url is configured', async () => {
    await service.sendError({ title: 'boom' });
    expect(service.enabled).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts a red embed with title, context and stack when configured', async () => {
    process.env.DISCORD_WEBHOOK_URL = WEBHOOK_URL;

    await service.sendError({
      title: 'Failed sending reminder',
      context: 'RemindersService',
      stack: 'Error: nope\n  at foo (bar.ts:1:1)',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body);
    const embed = body.embeds[0];
    expect(embed.title).toBe('🔴 Failed sending reminder');
    expect(embed.color).toBe(0xed4245);
    expect(embed.timestamp).toBeDefined();

    const fieldNames = embed.fields.map((f: any) => f.name);
    expect(fieldNames).toEqual(['Env', 'Context', 'Stack']);
    const stackField = embed.fields.find((f: any) => f.name === 'Stack');
    expect(stackField.value).toContain('```');
    expect(stackField.value).toContain('at foo');
  });

  it('dedupes repeated errors with the same context+title within the window', async () => {
    process.env.DISCORD_WEBHOOK_URL = WEBHOOK_URL;

    await service.sendError({ title: 'boom', context: 'Cron' });
    await service.sendError({ title: 'boom', context: 'Cron' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe distinct errors', async () => {
    process.env.DISCORD_WEBHOOK_URL = WEBHOOK_URL;

    await service.sendError({ title: 'boom', context: 'Cron' });
    await service.sendError({ title: 'other', context: 'Cron' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe('sanitización de datos personales', () => {
    beforeEach(() => {
      process.env.DISCORD_WEBHOOK_URL = WEBHOOK_URL;
    });

    it('sanitiza emails del título y del contexto', async () => {
      await service.sendError({
        title: 'Fallo al procesar a user@email.com',
        context: 'Reclamo de otro@dominio.com en RemindersService',
      });

      const [, init] = fetchMock.mock.calls[0];
      const embed = JSON.parse(init.body).embeds[0];
      const contextField = embed.fields.find((f: any) => f.name === 'Context');

      expect(embed.title).not.toContain('user@email.com');
      expect(embed.title).toContain('[EMAIL]');
      expect(contextField.value).not.toContain('otro@dominio.com');
      expect(contextField.value).toContain('[EMAIL]');
    });

    it('sanitiza IDs numéricos largos (más de 6 dígitos)', async () => {
      await service.sendError({
        title: 'Error con el usuario 1234567890',
        context: 'home_id=9876543210',
      });

      const [, init] = fetchMock.mock.calls[0];
      const embed = JSON.parse(init.body).embeds[0];
      const contextField = embed.fields.find((f: any) => f.name === 'Context');

      expect(embed.title).not.toContain('1234567890');
      expect(embed.title).toContain('[ID]');
      expect(contextField.value).not.toContain('9876543210');
      expect(contextField.value).toContain('[ID]');
    });

    it('no toca números cortos (≤6 dígitos), como códigos de error', async () => {
      await service.sendError({ title: 'HTTP 404 al buscar el recurso' });

      const [, init] = fetchMock.mock.calls[0];
      const embed = JSON.parse(init.body).embeds[0];

      expect(embed.title).toContain('404');
    });

    it('no envía el campo Stack en producción', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        await service.sendError({
          title: 'Failed sending reminder',
          stack: 'Error: nope\n  at foo (bar.ts:1:1)',
        });

        const [, init] = fetchMock.mock.calls[0];
        const embed = JSON.parse(init.body).embeds[0];
        const fieldNames = embed.fields.map((f: any) => f.name);

        expect(fieldNames).not.toContain('Stack');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('sí envía el campo Stack fuera de producción', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        await service.sendError({
          title: 'Failed sending reminder',
          stack: 'Error: nope\n  at foo (bar.ts:1:1)',
        });

        const [, init] = fetchMock.mock.calls[0];
        const embed = JSON.parse(init.body).embeds[0];
        const fieldNames = embed.fields.map((f: any) => f.name);

        expect(fieldNames).toContain('Stack');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
