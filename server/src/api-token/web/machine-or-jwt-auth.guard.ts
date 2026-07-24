import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from '../../auth/domain/auth.service';
import { ApiTokenService } from '../domain/api-token.service';
import { ApiToken } from '../domain/api-token.model';
import { scopeSatisfied, type ApiScope } from '../domain/api-scope';
import { REQUIRE_SCOPES_KEY } from './require-scopes.decorator';

// Request augmented with the machine token, when the caller authenticated with a
// bearer token rather than a session cookie.
export type MachineRequest = Request & { apiToken?: ApiToken };

// Accepts EITHER an interactive session cookie (Google/JWT, full user authority)
// OR a machine bearer token (scoped). Bearer requests additionally must satisfy
// any @RequireScopes declared on the handler.
@Injectable()
export class MachineOrJwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly apiTokenService: ApiTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MachineRequest>();
    const header = req.headers.authorization;

    if (header?.startsWith('Bearer ')) {
      return this.authenticateBearer(req, header.slice('Bearer '.length).trim(), context);
    }
    return this.authenticateCookie(req);
  }

  private async authenticateBearer(req: MachineRequest, raw: string, context: ExecutionContext): Promise<boolean> {
    const token = await this.apiTokenService.authenticate(raw);
    if (!token) {
      throw new UnauthorizedException('Invalid or expired API token');
    }
    const user = await this.authService.findUserById(token.userId);
    if (!user) {
      throw new UnauthorizedException('Token owner no longer exists');
    }
    req.user = user;
    req.apiToken = token;

    const required = this.reflector.getAllAndOverride<ApiScope[]>(REQUIRE_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && required.length > 0) {
      const granted = new Set(token.scopes);
      const missing = required.filter((scope) => !scopeSatisfied(granted, scope));
      if (missing.length > 0) {
        throw new ForbiddenException(`Token missing required scope(s): ${missing.join(', ')}`);
      }
    }
    return true;
  }

  private async authenticateCookie(req: MachineRequest): Promise<boolean> {
    const cookieToken = req.cookies?.access_token as string | undefined;
    if (!cookieToken) {
      throw new UnauthorizedException('Not authenticated');
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(cookieToken);
      const user = await this.authService.validateJwtPayload(payload);
      if (!user) {
        throw new UnauthorizedException('Session user no longer exists');
      }
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid session');
    }
  }
}
