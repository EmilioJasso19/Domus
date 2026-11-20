import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('MailService', () => {
  let service: MailService;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.MAIL_FROM = 'Domus <no-reply@mail.example.com>';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('envía el código con el remitente configurado', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null });

    await service.sendPasswordResetCode(
      'emilio@example.com',
      'Emilio',
      '123456',
      15,
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0];
    expect(payload).toMatchObject({
      from: 'Domus <no-reply@mail.example.com>',
      to: 'emilio@example.com',
    });
    expect(payload.subject).toContain('Domus');
    expect(payload.html).toContain('123456');
    expect(payload.text).toContain('123456');
    expect(payload.text).toContain('15 minutos');
  });

  it('escapa el nombre del usuario en el HTML', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null });

    await service.sendPasswordResetCode(
      'emilio@example.com',
      '<script>x</script>',
      '123456',
      15,
    );

    const payload = mockSend.mock.calls[0][0];
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
  });

  it('lanza un error si Resend responde con error', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Domain not verified' },
    });

    await expect(
      service.sendPasswordResetCode('emilio@example.com', 'Emilio', '1', 15),
    ).rejects.toThrow('Domain not verified');
  });

  it('en desarrollo sin RESEND_API_KEY imprime el código y no llama a Resend', async () => {
    delete process.env.RESEND_API_KEY;
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await service.sendPasswordResetCode(
      'emilio@example.com',
      'Emilio',
      '654321',
      15,
    );

    expect(mockSend).not.toHaveBeenCalled();
    expect(String(logSpy.mock.calls[0][0])).toContain('654321');
    expect(String(logSpy.mock.calls[0][0])).not.toContain('emilio@example.com');
    logSpy.mockRestore();
  });

  it('en producción sin RESEND_API_KEY lanza un error', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = 'production';

    await expect(
      service.sendPasswordResetCode('emilio@example.com', 'Emilio', '1', 15),
    ).rejects.toThrow('RESEND_API_KEY');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
