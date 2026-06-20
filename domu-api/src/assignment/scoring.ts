import { MemberSnapshot, AssignmentWeights, DEFAULT_WEIGHTS } from './assignment.types';

/**
 * Contexto de normalización: los máximos del conjunto de candidatos en evaluación.
 * Permite que cada término del costo viva en [0,1] y sea comparable entre miembros.
 */
export interface ScoringContext {
  maxLoad: number;
  maxCompletions: number;
}

// Normaliza un valor contra su máximo. Arranque en frío: si el máximo es 0,
// el término contribuye 0 (nunca NaN).
function normalize(value: number, max: number): number {
  return max <= 0 ? 0 : value / max;
}

/**
 * Función de costo compuesta (capa pura, sin I/O):
 *   C = load·(currentLoad/maxLoad) + preference·P + history·(recentCompletions/maxCompletions)
 * donde P es la preferencia CRUDA: gusta = -1, neutral = 0, disgusta = +1.
 * Una tarea que gusta abarata el costo; una que disgusta lo encarece.
 */
export function compositeCost(
  member: MemberSnapshot,
  ctx: ScoringContext,
  w: AssignmentWeights = DEFAULT_WEIGHTS,
): number {
  const L = normalize(member.currentLoad, ctx.maxLoad);
  const P = member.preference; // cruda en {-1, 0, 1}
  const H = normalize(member.recentCompletions, ctx.maxCompletions);
  return w.load * L + w.preference * P + w.history * H;
}

/**
 * Selecciona al miembro de menor costo. Devuelve null si no hay candidatos.
 * Desempate determinístico: menor costo -> menor carga -> menor userId
 * (comparado con localeCompare numérico, de modo que "2" < "10").
 */
export function selectAssignee(
  members: MemberSnapshot[],
  w: AssignmentWeights = DEFAULT_WEIGHTS,
): MemberSnapshot | null {
  if (members.length === 0) return null; // sin disponibles → el service decide qué hacer

  const ctx: ScoringContext = {
    maxLoad: Math.max(...members.map((m) => m.currentLoad), 0),
    maxCompletions: Math.max(...members.map((m) => m.recentCompletions), 0),
  };

  return members.reduce((best, m) => {
    const cost = compositeCost(m, ctx, w);
    const bestCost = compositeCost(best, ctx, w);
    if (cost < bestCost) return m;
    if (cost === bestCost) {
      // a igual costo, gana el de menor carga; si persiste, el menor userId.
      if (m.currentLoad < best.currentLoad) return m;
      if (
        m.currentLoad === best.currentLoad &&
        m.userId.localeCompare(best.userId, undefined, { numeric: true }) < 0
      ) {
        return m;
      }
    }
    return best;
  });
}
