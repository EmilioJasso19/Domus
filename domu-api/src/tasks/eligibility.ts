import { RoleName } from '@/role/constants/roles.constants';
import { Task } from './entities/task.entity';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';

// Elegibilidad para ser responsable de una tarea. Es un filtro DURO (como la
// disponibilidad), no un término de puntuación: con members_only solo los
// participantes con rol MEMBER cuentan; sin la bandera, cualquiera del hogar.
export function isEligibleResponsible(
  task: Pick<Task, 'members_only'>,
  participant: Pick<UserHomeRole, 'role'>,
): boolean {
  return !task.members_only || participant.role?.name === RoleName.MEMBER;
}

// ¿Hay al menos un MEMBER en el hogar? Sin ninguno, members_only=true no tiene
// sentido (nadie podría ser responsable).
export function hasMemberRole(
  participants: Pick<UserHomeRole, 'role'>[],
): boolean {
  return participants.some((p) => p.role?.name === RoleName.MEMBER);
}
