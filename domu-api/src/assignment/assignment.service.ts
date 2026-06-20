import { Injectable } from '@nestjs/common';
import { subDays, subMonths } from 'date-fns';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { BlockedSchedulesService } from '@/blocked-schedules/blocked-schedules.service';
import { PreferencesService } from '@/preferences/preferences.service';
import { TaskOccurrencesService } from '@/task-occurrences/task-occurrences.service';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';
import { BlockedSchedule } from '@/blocked-schedules/entities/blocked-schedule.entity';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';
import { Days } from '@/blocked-schedules/enums/days.enums';
import { FrequencyType } from '@/tasks/enums/frequency-type.enum';
import { AssignmentResult, MemberSnapshot } from './assignment.types';
import { selectAssignee } from './scoring';

export interface AssignAllResult {
  assigned: { occurrenceId: string; userId: string }[];
  unassigned: { occurrenceId: string; reason: 'NO_AVAILABLE' }[];
}

// getUTCDay(): 0 = domingo ... 6 = sábado.
const WEEKDAYS: Days[] = [
  Days.SUNDAY,
  Days.MONDAY,
  Days.TUESDAY,
  Days.WEDNESDAY,
  Days.THURSDAY,
  Days.FRIDAY,
  Days.SATURDAY,
];

/**
 * Capa de orquestación de la asignación automática. Reúne lo que la capa pura
 * (scoring) no puede conocer —miembros del hogar, disponibilidad por horarios
 * bloqueados, carga, preferencia e historial— y delega la elección final en
 * selectAssignee. La unidad asignada es la OCURRENCIA, no la tarea.
 */
@Injectable()
export class AssignmentService {
  constructor(
    private readonly uhrService: UserHomeRoleService,
    private readonly blockedSchedulesService: BlockedSchedulesService,
    private readonly preferencesService: PreferencesService,
    private readonly occurrencesService: TaskOccurrencesService,
  ) {}

  /** Asigna automáticamente una sola ocurrencia. */
  async assignOccurrence(occurrenceId: string): Promise<AssignmentResult> {
    const occurrence = await this.occurrencesService.findOne(occurrenceId);
    const homeId = occurrence.task.home_id;

    const members = await this.uhrService.findAllByHome(homeId);
    const available = await this.filterAvailable(members, occurrence);
    if (available.length === 0) {
      // La UI preguntará: ¿continuar de todas formas o cambiar fecha/hora?
      return { status: 'NO_AVAILABLE' };
    }

    const snapshots = await Promise.all(
      available.map((m) =>
        this.buildSnapshot(
          m,
          occurrence,
          this.occurrencesService.sumActiveEffort(m.user_id, homeId),
        ),
      ),
    );

    const chosen = selectAssignee(snapshots);
    if (!chosen) {
      return { status: 'NO_AVAILABLE' };
    }

    await this.occurrencesService.setResponsible(occurrence, chosen.userId);
    return { status: 'OK', userId: chosen.userId };
  }

  /**
   * Asignación masiva: recorre todas las ocurrencias sin asignar del hogar en
   * orden determinístico (due_date, id) y actualiza la carga en memoria del
   * elegido ANTES de puntuar la siguiente, para repartir de forma justa.
   * Las ocurrencias sin nadie disponible quedan sin asignar y se devuelven aparte.
   */
  async assignAllForHome(homeId: string): Promise<AssignAllResult> {
    const occurrences =
      await this.occurrencesService.findUnassignedByHome(homeId);
    const members = await this.uhrService.findAllByHome(homeId);

    // Carga base (persistida) de cada miembro; se incrementa en memoria al asignar.
    const loadByUser = new Map<string, number>();
    for (const m of members) {
      loadByUser.set(
        m.user_id,
        await this.occurrencesService.sumActiveEffort(m.user_id, homeId),
      );
    }

    const result: AssignAllResult = { assigned: [], unassigned: [] };

    for (const occurrence of occurrences) {
      const available = await this.filterAvailable(members, occurrence);
      if (available.length === 0) {
        result.unassigned.push({
          occurrenceId: occurrence.id,
          reason: 'NO_AVAILABLE',
        });
        continue;
      }

      const snapshots = await Promise.all(
        available.map((m) =>
          this.buildSnapshot(
            m,
            occurrence,
            Promise.resolve(loadByUser.get(m.user_id) ?? 0),
          ),
        ),
      );

      const chosen = selectAssignee(snapshots);
      if (!chosen) {
        result.unassigned.push({
          occurrenceId: occurrence.id,
          reason: 'NO_AVAILABLE',
        });
        continue;
      }

      await this.occurrencesService.setResponsible(occurrence, chosen.userId);
      loadByUser.set(
        chosen.userId,
        (loadByUser.get(chosen.userId) ?? 0) +
          (occurrence.task.physical_effort ?? 0),
      );
      result.assigned.push({
        occurrenceId: occurrence.id,
        userId: chosen.userId,
      });
    }

    return result;
  }

  // ===== Helpers =====

  // Filtro DURO de disponibilidad (antes de puntuar).
  private async filterAvailable(
    members: UserHomeRole[],
    occurrence: TaskOccurrence,
  ): Promise<UserHomeRole[]> {
    const homeId = occurrence.task.home_id;
    const weekday = WEEKDAYS[this.weekdayIndex(occurrence.due_date)];

    const available: UserHomeRole[] = [];
    for (const member of members) {
      const schedules = await this.blockedSchedulesService.findAll(
        member.user,
        homeId,
      );
      if (!this.isBlocked(schedules, occurrence, weekday)) {
        available.push(member);
      }
    }
    return available;
  }

  private isBlocked(
    schedules: BlockedSchedule[],
    occurrence: TaskOccurrence,
    weekday: Days,
  ): boolean {
    if (occurrence.due_time) {
      // Con hora: excluye por horarios RECURRENTES cuyo día coincide y cuyo
      // rango horario contiene la hora (respetando el rango de fechas si existe).
      return schedules.some(
        (s) =>
          s.day === weekday &&
          this.withinDateRange(occurrence.due_date, s) &&
          this.timeOverlaps(occurrence.due_time!, s.start_time, s.end_time),
      );
    }
    // Sin hora: excluye solo por horarios TEMPORALES (con rango de fechas)
    // que cubren la fecha de la ocurrencia (días completos fuera de casa).
    return schedules.some(
      (s) =>
        !!s.start_date &&
        !!s.end_date &&
        occurrence.due_date >= s.start_date &&
        occurrence.due_date <= s.end_date,
    );
  }

  private withinDateRange(date: string, s: BlockedSchedule): boolean {
    if (s.start_date && s.end_date) {
      return date >= s.start_date && date <= s.end_date;
    }
    return true; // recurrente: aplica toda la semana
  }

  // Intervalo semiabierto [start, end): una hora exactamente igual al fin se
  // considera libre.
  private timeOverlaps(time: string, start: string, end: string): boolean {
    const t = this.toSeconds(time);
    return t >= this.toSeconds(start) && t < this.toSeconds(end);
  }

  private toSeconds(time: string): number {
    const [h, m, s] = time.split(':').map(Number);
    return h * 3600 + m * 60 + (s || 0);
  }

  private weekdayIndex(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }

  private async buildSnapshot(
    member: UserHomeRole,
    occurrence: TaskOccurrence,
    currentLoad: Promise<number>,
  ): Promise<MemberSnapshot> {
    const homeId = occurrence.task.home_id;
    const [load, preference, recentCompletions] = await Promise.all([
      currentLoad,
      this.preferenceFor(member.user_id, occurrence.task.id),
      this.occurrencesService.countCompletionsSince(
        member.user_id,
        homeId,
        this.windowStart(occurrence.task.frequency_type),
      ),
    ]);

    return {
      userId: member.user_id,
      currentLoad: load,
      preference,
      recentCompletions,
    };
  }

  // Preferencia cruda del miembro por la tarea: gusta = -1, neutral/none = 0, disgusta = +1.
  private async preferenceFor(
    userId: string,
    taskId: string,
  ): Promise<-1 | 0 | 1> {
    const pref = await this.preferencesService.findOneByUserAndTask(
      userId,
      taskId,
    );
    const score = pref?.score ?? 0;
    return score < 0 ? -1 : score > 0 ? 1 : 0;
  }

  // Ventana de historial según la frecuencia de la tarea:
  // diaria -> 7 días, semanal -> 4 semanas, mensual -> 6 meses.
  private windowStart(frequency: FrequencyType): Date {
    const now = new Date();
    switch (frequency) {
      case FrequencyType.DAILY:
        return subDays(now, 7);
      case FrequencyType.MONTHLY:
        return subMonths(now, 6);
      case FrequencyType.WEEKLY:
      default:
        return subDays(now, 28);
    }
  }
}
