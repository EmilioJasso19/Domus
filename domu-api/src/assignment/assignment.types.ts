export interface MemberSnapshot {
  userId: string;
  currentLoad: number;        // Σ esfuerzo de las ocurrencias activas del miembro
  preference: -1 | 0 | 1;     // gusta = -1 | neutral = 0 | disgusta = +1 (preferencia cruda)
  recentCompletions: number;  // completadas en la ventana de la frecuencia
  recentAssignmentsToThisTask: number; // veces que hizo ESTA tarea en la ventana
}

export interface AssignmentWeights {
  load: number;         // α
  preference: number;   // β
  history: number;      // γ
  taskAffinity: number; // δ — penaliza repetir la misma tarea
}

export const DEFAULT_WEIGHTS: AssignmentWeights = {
  load: 0.5,
  preference: 0.3,
  history: 0.2,
  taskAffinity: 0.15,
};

export type AssignmentResult =
  | { status: 'OK'; userId: string }
  | { status: 'NO_AVAILABLE' };
