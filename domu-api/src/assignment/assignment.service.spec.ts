import { AssignmentService } from './assignment.service';
import { FrequencyType } from '@/tasks/enums/frequency-type.enum';

// weekday (lowercase) de una fecha YYYY-MM-DD, igual que el mapeo del service.
const dayOf = (d: string) =>
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date(`${d}T00:00:00Z`).getUTCDay()
  ];

const member = (id: string) => ({ user_id: id, user: { id } });

const occurrence = (over: any = {}) => ({
  id: '1',
  due_date: '2026-06-18',
  due_time: null,
  task: {
    id: 't1',
    home_id: 'h1',
    physical_effort: 2,
    frequency_type: FrequencyType.DAILY,
  },
  ...over,
});

describe('AssignmentService', () => {
  let service: AssignmentService;
  let uhr: any;
  let blocked: any;
  let prefs: any;
  let occurrences: any;

  beforeEach(() => {
    uhr = { findAllByHome: jest.fn() };
    blocked = { findAll: jest.fn().mockResolvedValue([]) };
    prefs = { findOneByUserAndTask: jest.fn().mockResolvedValue(null) };
    occurrences = {
      findOne: jest.fn(),
      sumActiveEffort: jest.fn().mockResolvedValue(0),
      countCompletionsSince: jest.fn().mockResolvedValue(0),
      findUnassignedByHome: jest.fn(),
      setResponsible: jest.fn().mockResolvedValue(undefined),
    };
    service = new AssignmentService(uhr, blocked, prefs, occurrences);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignOccurrence', () => {
    it('asigna y persiste al miembro de menor carga del hogar', async () => {
      occurrences.findOne.mockResolvedValue(occurrence());
      uhr.findAllByHome.mockResolvedValue([member('1'), member('2')]);
      occurrences.sumActiveEffort.mockImplementation(async (userId: string) =>
        userId === '2' ? 10 : 0,
      );

      const result = await service.assignOccurrence('1');

      expect(result).toEqual({ status: 'OK', userId: '1' });
      expect(occurrences.setResponsible).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' }),
        '1',
      );
    });

    it('solo considera a los miembros del hogar (no consulta usuarios globales)', async () => {
      occurrences.findOne.mockResolvedValue(occurrence());
      uhr.findAllByHome.mockResolvedValue([member('1')]);

      await service.assignOccurrence('1');

      expect(uhr.findAllByHome).toHaveBeenCalledWith('h1');
    });

    it('excluye por horario RECURRENTE cuando la ocurrencia tiene due_time', async () => {
      const occ = occurrence({ due_time: '09:00:00' });
      occurrences.findOne.mockResolvedValue(occ);
      uhr.findAllByHome.mockResolvedValue([member('1'), member('2')]);
      // '2' tendría menor carga, pero está bloqueado a esa hora -> gana '1'.
      occurrences.sumActiveEffort.mockImplementation(async (userId: string) =>
        userId === '1' ? 100 : 0,
      );
      blocked.findAll.mockImplementation(async (user: any) =>
        user.id === '2'
          ? [
              {
                day: dayOf(occ.due_date),
                start_time: '08:00:00',
                end_time: '12:00:00',
              },
            ]
          : [],
      );

      const result = await service.assignOccurrence('1');

      expect(result).toEqual({ status: 'OK', userId: '1' });
    });

    it('sin due_time excluye por horario TEMPORAL (rango de fechas) que cubre la fecha', async () => {
      const occ = occurrence({ due_date: '2026-06-20', due_time: null });
      occurrences.findOne.mockResolvedValue(occ);
      uhr.findAllByHome.mockResolvedValue([member('1'), member('2')]);
      occurrences.sumActiveEffort.mockImplementation(async (userId: string) =>
        userId === '1' ? 100 : 0,
      );
      blocked.findAll.mockImplementation(async (user: any) =>
        user.id === '2'
          ? [
              {
                day: 'monday',
                start_time: '00:00:00',
                end_time: '23:59:00',
                start_date: '2026-06-19',
                end_date: '2026-06-21',
              },
            ]
          : [],
      );

      const result = await service.assignOccurrence('1');

      expect(result).toEqual({ status: 'OK', userId: '1' });
    });

    it('devuelve NO_AVAILABLE y no persiste cuando nadie está disponible', async () => {
      const occ = occurrence({ due_time: '09:00:00' });
      occurrences.findOne.mockResolvedValue(occ);
      uhr.findAllByHome.mockResolvedValue([member('1'), member('2')]);
      blocked.findAll.mockResolvedValue([
        { day: dayOf(occ.due_date), start_time: '00:00:00', end_time: '23:59:00' },
      ]);

      const result = await service.assignOccurrence('1');

      expect(result).toEqual({ status: 'NO_AVAILABLE' });
      expect(occurrences.setResponsible).not.toHaveBeenCalled();
    });
  });

  describe('assignAllForHome', () => {
    it('reparte actualizando la carga en memoria y separa las no asignables', async () => {
      const occA = occurrence({
        id: 'A',
        due_date: '2026-06-10',
        task: { ...occurrence().task, physical_effort: 5 },
      });
      const occB = occurrence({
        id: 'B',
        due_date: '2026-06-11',
        task: { ...occurrence().task, physical_effort: 5 },
      });
      const occC = occurrence({ id: 'C', due_date: '2026-06-20' });

      occurrences.findUnassignedByHome.mockResolvedValue([occA, occB, occC]);
      uhr.findAllByHome.mockResolvedValue([member('1'), member('2')]);
      occurrences.sumActiveEffort.mockResolvedValue(0);
      // Ambos miembros tienen un bloqueo temporal que solo cubre la fecha de occC.
      blocked.findAll.mockResolvedValue([
        {
          day: 'monday',
          start_time: '00:00:00',
          end_time: '23:59:00',
          start_date: '2026-06-19',
          end_date: '2026-06-21',
        },
      ]);

      const result = await service.assignAllForHome('h1');

      // occA: empate de carga -> menor userId '1'. occB: '1' ya tiene carga 5 -> '2'.
      expect(result.assigned).toEqual([
        { occurrenceId: 'A', userId: '1' },
        { occurrenceId: 'B', userId: '2' },
      ]);
      expect(result.unassigned).toEqual([
        { occurrenceId: 'C', reason: 'NO_AVAILABLE' },
      ]);
      expect(occurrences.setResponsible).toHaveBeenCalledTimes(2);
    });
  });
});
