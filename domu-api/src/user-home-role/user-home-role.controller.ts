import { Controller } from '@nestjs/common';
import { UserHomeRoleService } from './user-home-role.service';

@Controller('user-home-role')
export class UserHomeRoleController {
  constructor(private readonly userHomeRoleService: UserHomeRoleService) {}
}
