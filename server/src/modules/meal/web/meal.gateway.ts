import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@platform/auth/domain/auth.service';
import { SharingService } from '@platform/sharing/domain/sharing.service';

// Live updates for meals/planner/shopping, scoped per household (room `household:<id>`).
@WebSocketGateway({
  namespace: 'meal',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MealGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly sharingService: SharingService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const user = await this.authenticateClient(client);
    if (!user) {
      client.disconnect();
      return;
    }
    client.data.userId = user.id;
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { householdId: string },
  ): Promise<{ ok: boolean }> {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data.householdId) {
      return { ok: false };
    }
    try {
      await this.sharingService.assertHouseholdPermission(data.householdId, userId, ['owner', 'editor', 'viewer']);
      await client.join(`household:${data.householdId}`);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { householdId: string },
  ): Promise<void> {
    await client.leave(`household:${data.householdId}`);
  }

  notifyChanged(householdId: string): void {
    this.server.to(`household:${householdId}`).emit('meal:changed', { householdId });
  }

  private async authenticateClient(client: Socket): Promise<{ id: string } | null> {
    try {
      const rawCookie = client.handshake.headers.cookie;
      if (!rawCookie) {
        return null;
      }
      const token = rawCookie
        .split(';')
        .map((c) => c.trim().split('='))
        .find(([name]) => name === 'access_token')?.[1];
      if (!token) {
        return null;
      }
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.authService.validateJwtPayload(payload);
      return user ? { id: user.id } : null;
    } catch {
      return null;
    }
  }
}
