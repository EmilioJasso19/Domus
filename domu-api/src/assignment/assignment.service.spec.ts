import { AssignmentService } from './assignment.service';
// expo-server-sdk es ESM-only; la cadena de dependencias lo carga a resolver.
jest.mock('expo-server-sdk', () => ({ Expo: class {} }));
import { FrequencyType } from '@/tasks/enums/frequency-type.enum';

// weekday (lowercase) de una fecha YYYY-MM-DD, igual que el mapeo del service.
const dayOf = (d: string) =>
  [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][new Date(`${d}T00:00:00Z`).getUTCDay()];

const member = (id: string, role = 'MEMBER') => ({
  user_id: id,
  user: { id },
  role: { name: role },
});

const occurrence = (over: any = {}) => ({
  id: '1',
  due_date: '2026-06-18',
  due_time: null,
  task: {
    id: 't1',
    home_id: 'h1',
    physical_effort: 2,
    frequency_type: FrequencyType.DAILY,
    // Bandera de la PLANTILLA (tasks.members_only); la ocurrencia la hereda.
    members_only: false,
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
      countAssignmentsSince: jest.fn().mockResolvedValue(0),
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
      occurrences.sumActiveEffort.mockImplementation((userId: string) =>
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
      occurrences.sumActiveEffort.mockImplementation((userId: string) =>
        userId === '1' ? 100 : 0,
      );
      blocked.findAll.mockImplementation((user: any) =>
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
      occurrences.sumActiveEffort.mockImplementation((userId: string) =>
        userId === '1' ? 100 : 0,
      );
      blocked.findAll.mockImplementation((user: any) =>
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
        {
          day: dayOf(occ.due_date),
          start_time: '00:00:00',
          end_time: '23:59:00',
        },
      ]);

      const result = await service.assignOccurrence('1');

      expect(result).toEqual({ status: 'NO_AVAILABLE' });
      expect(occurrences.setResponsible).not.toHaveBeenCalled();
    });

    it('la afinidad de tarea desempata: gana quien hizo menos veces ESTA tarea', async () => {
      occurrences.findOne.mockResolvedValue(occurrence());
      uhr.findAllByHome.mockResolvedValue([member('1'), member('2')]);
      // Todo igual (carga 0, sin preferencias, sin historial) salvo que '1' ya hizo
      // esta tarea 3 veces. Sin el factor, el empate iría al menor userId ('1');
      // con el factor, gana '2'.
      occurrences.countAssignmentsSince.mockImplementation((userId: string) =>
        userId === '1' ? 3 : 0,
      );

      const result = await service.assignOccurrence('1');

      expect(result).toEqual({ status: 'OK', userId: '2' });
      expect(occurrences.setResponsible).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' }),
        '2',
      );
    });

    describe('members_only (solo miembros)', () => {
      it('con members_only=true ignora al OWNER aunque tenga la menor carga', async () => {
        occurrences.findOne.mockResolvedValue(
          occurrence({ task: { ...occurrence().task, members_only: true } }),
        );
        uhr.findAllByHome.mockResolvedValue([
          member('1', 'OWNER'),
          member('2', 'MEMBER'),
        ]);
        occurrences.sumActiveEffort.mockImplementation((userId: string) =>
          userId === '2' ? 10 : 0,
        );

        const result = await service.assignOccurrence('1');

        expect(result).toEqual({ status: 'OK', userId: '2' });
        expect(occurrences.setResponsible).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1' }),
          '2',
        );
      });

      it('con members_only=false un OWNER puede ganar', async () => {
        occurrences.findOne.mockResolvedValue(
          occurrence({ task: { ...occurrence().task, members_only: false } }),
        );
        uhr.findAllByHome.mockResolvedValue([
          member('1', 'OWNER'),
          member('2', 'MEMBER'),
        ]);
        occurrences.sumActiveEffort.mockImplementation((userId: string) =>
          userId === '2' ? 10 : 0,
        );

        const result = await service.assignOccurrence('1');

        expect(result).toEqual({ status: 'OK', userId: '1' });
      });

      it('con members_only=true y solo OWNERs devuelve NO_AVAILABLE sin persistir', async () => {
        occurrences.findOne.mockResolvedValue(
          occurrence({ task: { ...occurrence().task, members_only: true } }),
        );
        uhr.findAllByHome.mockResolvedValue([member('1', 'OWNER')]);

        const result = await service.assignOccurrence('1');

        expect(result).toEqual({ status: 'NO_AVAILABLE' });
        expect(occurrences.setResponsible).not.toHaveBeenCalled();
      });

      it('con members_only=true y todos los MEMBER bloqueados no cae en el OWNER', async () => {
        const occ = occurrence({
          due_time: '09:00:00',
          task: { ...occurrence().task, members_only: true },
        });
        occurrences.findOne.mockResolvedValue(occ);
        uhr.findAllByHome.mockResolvedValue([
          member('1', 'OWNER'),
          member('2', 'MEMBER'),
        ]);
        blocked.findAll.mockImplementation((user: any) =>
          user.id === '2'
            ? [
                {
                  day: dayOf(occ.due_date),
                  start_time: '00:00:00',
                  end_time: '23:59:00',
                },
              ]
            : [],
        );

        const result = await service.assignOccurrence('1');

        expect(result).toEqual({ status: 'NO_AVAILABLE' });
        expect(occurrences.setResponsible).not.toHaveBeenCalled();
      });
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

    it('filtra candidatos por ocurrencia según members_only de cada tarea y acumula carga', async () => {
      // A: solo miembros -> candidato único '2' (MEMBER).
      const occA = occurrence({
        id: 'A',
        due_date: '2026-06-10',
        task: {
          ...occurrence().task,
          id: 'tA',
          members_only: true,
          physical_effort: 5,
        },
      });
      // B: para todos -> '1' (OWNER) tiene menor carga porque '2' acaba de recibir A.
      const occB = occurrence({
        id: 'B',
        due_date: '2026-06-11',
        task: {
          ...occurrence().task,
          id: 'tB',
          members_only: false,
          physical_effort: 5,
        },
      });
      // C: solo miembros -> vuelve a '2' aunque '1' tenga la misma carga.
      const occC = occurrence({
        id: 'C',
        due_date: '2026-06-12',
        task: {
          ...occurrence().task,
          id: 'tC',
          members_only: true,
          physical_effort: 5,
        },
      });

      occurrences.findUnassignedByHome.mockResolvedValue([occA, occB, occC]);
      uhr.findAllByHome.mockResolvedValue([
        member('1', 'OWNER'),
        member('2', 'MEMBER'),
      ]);
      occurrences.sumActiveEffort.mockResolvedValue(0);

      const result = await service.assignAllForHome('h1');

      expect(result.assigned).toEqual([
        { occurrenceId: 'A', userId: '2' },
        { occurrenceId: 'B', userId: '1' },
        { occurrenceId: 'C', userId: '2' },
      ]);
      expect(result.unassigned).toEqual([]);
    });
  });

  // C49 — La ventana de historial depende de la frecuencia de la tarea:
  // diaria -> 7 días, semanal -> 28 días, mensual -> ~6 meses (~180 días).
  // Se verifica leyendo el argumento `since` con el que se consulta el historial.
  describe('C49 - Ventana de historial por frecuencia', () => {
    const daysAgo = (since: Date) =>
      (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000);

    const runWith = async (frequency_type: FrequencyType) => {
      occurrences.findOne.mockResolvedValue(
        occurrence({ task: { ...occurrence().task, frequency_type } }),
      );
      uhr.findAllByHome.mockResolvedValue([member('1')]);
      await service.assignOccurrence('1');
      const since = occurrences.countCompletionsSince.mock.calls[0][2] as Date;
      return daysAgo(since);
    };

    it('diaria -> ventana de 7 días', async () => {
      expect(await runWith(FrequencyType.DAILY)).toBeCloseTo(7, 1);
    });

    it('semanal -> ventana de 28 días', async () => {
      expect(await runWith(FrequencyType.WEEKLY)).toBeCloseTo(28, 1);
    });

    it('mensual -> ventana de ~6 meses (175-190 días)', async () => {
      const d = await runWith(FrequencyType.MONTHLY);
      expect(d).toBeGreaterThanOrEqual(175);
      expect(d).toBeLessThanOrEqual(190);
    });
  });

  // C30 — Al salir del hogar, el FK ON DELETE CASCADE elimina los blocked_schedules
  // del usuario. Es una garantía a nivel de base de datos; requiere prueba e2e con
  // PostgreSQL real (la suite unitaria mockea el repositorio).
  it.todo(
    'C30: el cascade de blocked_schedules al salir requiere prueba e2e con BD',
  );

  // C52 — El aviso de fecha de entrega lejana es una validación de UI (modal de
  // confirmación en domus-front/app/(tabs)/tasks.tsx). No tiene lógica de backend.
  it.todo(
    'C52: el aviso de fecha lejana es frontend-only (sin objetivo de backend)',
  );
});
