/**
 * Pruebas unitarias del núcleo del algoritmo de asignación (función pura).
 * No tocan base de datos: son la base TDD del diferenciador académico.
 *
 * Contrato esperado en ./scoring (impleméntalo y vuelve a correr):
 *
 *   export interface MemberSnapshot {
 *     userId: string;
 *     currentLoad: number;        // Σ esfuerzo de tareas activas
 *     preference: -1 | 0 | 1;     // gusta = -1 | neutral = 0 | disgusta = +1
 *     recentCompletions: number;  // completadas en la ventana de la frecuencia
 *   }
 *   export interface ScoringContext { maxLoad: number; maxCompletions: number }
 *   export interface AssignmentWeights { load: number; preference: number; history: number }
 *   export const DEFAULT_WEIGHTS: AssignmentWeights = { load: 0.5, preference: 0.3, history: 0.2 };
 *
 *   computeCost(member, ctx, weights?) -> number
 *     C = α·(load/maxLoad) + β·preference + γ·(recentCompletions/maxCompletions)
 *     (cada término normalizado da 0 cuando su max es 0: arranque en frío sin NaN)
 *
 *   selectAssignee(members, weights?) -> MemberSnapshot | null
 *     null si members está vacío; si no, el de menor costo.
 *     Desempate determinístico: menor costo -> menor carga -> menor userId.
 *
 * Los casos selectAssignee mapean a la tabla del algoritmo (C39–C44,
 * continuando la numeración tras el módulo de horarios que terminó en C38).
 */
import {
  compositeCost,
  selectAssignee,
  ScoringContext,
} from './scoring';
import { MemberSnapshot, AssignmentWeights, DEFAULT_WEIGHTS } from './assignment.types';

const member = (over: Partial<MemberSnapshot> = {}): MemberSnapshot => ({
  userId: '1',
  currentLoad: 0,
  preference: 0,
  recentCompletions: 0,
  recentAssignmentsToThisTask: 0,
  ...over,
});

describe('computeCost', () => {
  it('calcula el costo esperado para un caso numérico conocido', () => {
    // load 4/8=0.5, pref +1, history 2/4=0.5
    // C = 0.5*0.5 + 0.3*1 + 0.2*0.5 = 0.25 + 0.3 + 0.1 = 0.65
    const ctx: ScoringContext = {
      maxLoad: 8,
      maxCompletions: 4,
      maxTaskAssignments: 0,
    };
    const m = member({ currentLoad: 4, preference: 1, recentCompletions: 2 });

    expect(compositeCost(m, ctx)).toBeCloseTo(0.65);
  });

  it('una tarea que gusta (-1) da menor costo que una que disgusta (+1)', () => {
    const ctx: ScoringContext = {
      maxLoad: 4,
      maxCompletions: 0,
      maxTaskAssignments: 0,
    };
    const liked = member({ currentLoad: 2, preference: -1 });
    const disliked = member({ currentLoad: 2, preference: 1 });

    expect(compositeCost(liked, ctx)).toBeLessThan(compositeCost(disliked, ctx));
  });

  it('arranque en frío: con max 0 y preferencia neutral devuelve 0 sin NaN', () => {
    const ctx: ScoringContext = {
      maxLoad: 0,
      maxCompletions: 0,
      maxTaskAssignments: 0,
    };
    const cost = compositeCost(member(), ctx);

    expect(Number.isNaN(cost)).toBe(false);
    expect(cost).toBeCloseTo(0);
  });

  it('a mayor carga, mayor costo (manteniendo lo demás igual)', () => {
    const ctx: ScoringContext = {
      maxLoad: 6,
      maxCompletions: 0,
      maxTaskAssignments: 0,
    };
    const light = member({ currentLoad: 2 });
    const heavy = member({ currentLoad: 6 });

    expect(compositeCost(light, ctx)).toBeLessThan(compositeCost(heavy, ctx));
  });
});

describe('selectAssignee', () => {
  it('devuelve null cuando no hay candidatos', () => {
    expect(selectAssignee([])).toBeNull();
  });

  // C39: único candidato disponible -> se le asigna pese a su carga/preferencia
  it('C39: asigna al único candidato aunque tenga carga alta y preferencia negativa', () => {
    const only = member({ userId: '7', currentLoad: 99, preference: 1, recentCompletions: 50 });
    expect(selectAssignee([only])?.userId).toBe('7');
  });

  // C40: decisión por carga (preferencia e historial iguales)
  it('C40: con preferencia e historial iguales, gana el de menor carga', () => {
    const low = member({ userId: '1', currentLoad: 2 });
    const high = member({ userId: '2', currentLoad: 5 });
    expect(selectAssignee([high, low])?.userId).toBe('1');
  });

  // C41: decisión por preferencia (cargas iguales)
  it('C41: con cargas iguales, gana quien tiene la tarea como preferida', () => {
    const likes = member({ userId: '1', currentLoad: 3, preference: -1 });
    const dislikes = member({ userId: '2', currentLoad: 3, preference: 1 });
    expect(selectAssignee([dislikes, likes])?.userId).toBe('1');
  });

  // C42: penalización por historial
  it('C42: con carga y preferencia iguales, gana quien no trabajó recientemente', () => {
    const rested = member({ userId: '1', currentLoad: 3, recentCompletions: 0 });
    const busy = member({ userId: '2', currentLoad: 3, recentCompletions: 4 });
    expect(selectAssignee([busy, rested])?.userId).toBe('1');
  });

  // C45: penalización por afinidad de tarea (todo lo demás igual)
  it('C45: con carga, preferencia e historial iguales, gana quien hizo menos esta tarea', () => {
    const fresh = member({
      userId: '1',
      currentLoad: 3,
      recentAssignmentsToThisTask: 0,
    });
    const repeated = member({
      userId: '2',
      currentLoad: 3,
      recentAssignmentsToThisTask: 3,
    });
    expect(selectAssignee([repeated, fresh])?.userId).toBe('1');
  });

  // C43: arranque en frío -> solo cuenta la carga, sin romperse
  it('C43: sin preferencias ni historial, decide solo por carga', () => {
    const a = member({ userId: '1', currentLoad: 1 });
    const b = member({ userId: '2', currentLoad: 4 });
    expect(() => selectAssignee([a, b])).not.toThrow();
    expect(selectAssignee([b, a])?.userId).toBe('1');
  });

  // C44: determinismo en empate total -> menor userId, e idéntico al repetir
  it('C44: en empate total gana el menor userId, sin importar el orden', () => {
    const m5 = member({ userId: '5', currentLoad: 2 });
    const m2 = member({ userId: '2', currentLoad: 2 });

    expect(selectAssignee([m5, m2])?.userId).toBe('2');
    expect(selectAssignee([m2, m5])?.userId).toBe('2'); // el orden no cambia el resultado
  });

  it('C44: ejecuciones repetidas con el mismo input dan el mismo resultado', () => {
    const members = [
      member({ userId: '3', currentLoad: 2, preference: 1 }),
      member({ userId: '1', currentLoad: 1, preference: 0 }),
      member({ userId: '2', currentLoad: 4, preference: -1 }),
    ];
    const first = selectAssignee([...members]);
    const second = selectAssignee([...members]);
    expect(first).toEqual(second);
  });
});