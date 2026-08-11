import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PushService } from '../domain/push.service';
import { SubscribeDto, UnsubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '@platform/auth/web/jwt-auth.guard';
import { User } from '@platform/auth/domain/user.model';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getPublicKey(): { publicKey: string } {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  async subscribe(@Req() req: Request, @Body() dto: SubscribeDto): Promise<{ ok: boolean }> {
    const userId = (req.user as User).id;
    const userAgent = req.headers['user-agent'] ?? null;
    await this.pushService.subscribe(userId, dto.endpoint, dto.keys.p256dh, dto.keys.auth, userAgent);
    return { ok: true };
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto): Promise<{ ok: boolean }> {
    await this.pushService.unsubscribe(dto.endpoint);
    return { ok: true };
  }
}
