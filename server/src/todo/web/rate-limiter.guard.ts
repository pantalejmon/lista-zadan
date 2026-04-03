import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { User } from '../../auth/domain/user.model';

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly windows = new Map<string, RateLimitWindow>();
  private readonly windowMs = 60_000;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req.user as User).id;
    const maxRequests = this.configService.get<number>('rateLimiter.maxCreatesPerMinute', 60);
    const now = Date.now();

    const entry = this.windows.get(userId);
    if (!entry || now >= entry.resetAt) {
      this.windows.set(userId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= maxRequests) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.count++;
    return true;
  }
}
