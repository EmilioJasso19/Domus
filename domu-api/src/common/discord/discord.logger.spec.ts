import { DiscordLogger } from './discord.logger';
import { DiscordService, DISCORD_LOG_CONTEXT } from './discord.service';

describe('DiscordLogger', () => {
  let discord: { sendError: jest.Mock };
  let logger: DiscordLogger;

  beforeEach(() => {
    discord = { sendError: jest.fn() };
    logger = new DiscordLogger(discord as unknown as DiscordService);
    // Silenciar la salida real de ConsoleLogger durante el test.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('forwards an error log to Discord, parsing stack and context', () => {
    logger.error(
      'Failed sending reminder',
      'Error: x\n  at y',
      'RemindersService',
    );

    expect(discord.sendError).toHaveBeenCalledTimes(1);
    expect(discord.sendError).toHaveBeenCalledWith({
      title: 'Failed sending reminder',
      context: 'RemindersService',
      stack: 'Error: x\n  at y',
    });
  });

  it('does NOT forward errors originating from the Discord sender itself (loop guard)', () => {
    logger.error('webhook failed', undefined, DISCORD_LOG_CONTEXT);
    expect(discord.sendError).not.toHaveBeenCalled();
  });

  it('uses an Error message/stack when passed an Error object', () => {
    const err = new Error('kaboom');
    logger.error(err);

    expect(discord.sendError).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'kaboom', stack: err.stack }),
    );
  });
});
