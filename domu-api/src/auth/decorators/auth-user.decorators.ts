import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Lo que JwtStrategy.validate() deja en request.user tras pasar el guard.
export interface AuthenticatedUser {
  id: string;
  email: string;
}

interface RequestWithUser {
  user: AuthenticatedUser;
}

export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
