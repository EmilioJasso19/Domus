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
});
