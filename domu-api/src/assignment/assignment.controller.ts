import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  // Asignación automática de una sola ocurrencia.
  // Devuelve { status: 'OK', userId } o { status: 'NO_AVAILABLE' }.
  @Post('occurrences/:id')
  assignOccurrence(@Param('id') id: string) {
    return this.assignmentService.assignOccurrence(id);
  }

  // Asignación masiva de las ocurrencias sin asignar de un hogar.
  // Devuelve { assigned: [...], unassigned: [...] } para que la UI muestre
  // un modal de conflictos con las que quedaron sin nadie disponible.
  @Post('homes/:homeId/assign-all')
  assignAll(@Param('homeId') homeId: string) {
    return this.assignmentService.assignAllForHome(homeId);
  }
}
