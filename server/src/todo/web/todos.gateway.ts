import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/domain/auth.service';
import { SharingService } from '../../sharing/domain/sharing.service';
import { TodoResponse } from './dto/todo.response';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TodosGateway implements OnGatewayConnection, OnGatewayDisconnect {
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

  handleDisconnect(): void {
    // cleanup handled automatically by socket.io room management
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { listId: string },
  ): Promise<{ ok: boolean }> {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data.listId) {
      return { ok: false };
    }

    try {
      await this.sharingService.assertPermission(data.listId, userId, ['owner', 'editor', 'viewer']);
      await client.join(`list:${data.listId}`);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { listId: string },
  ): Promise<void> {
    await client.leave(`list:${data.listId}`);
  }

  notifyTodoCreated(listId: string, todo: TodoResponse): void {
    this.server.to(`list:${listId}`).emit('todo:created', todo);
  }

  notifyTodoUpdated(listId: string, todo: TodoResponse): void {
    this.server.to(`list:${listId}`).emit('todo:updated', todo);
  }

  notifyTodoDeleted(listId: string, todoId: string): void {
    this.server.to(`list:${listId}`).emit('todo:deleted', { id: todoId, listId });
  }

  notifyRecurrenceCreated(listId: string, todos: TodoResponse[]): void {
    this.server.to(`list:${listId}`).emit('todo:recurrence-created', todos);
  }

  notifyRecurrenceDeleted(listId: string, groupId: string): void {
    this.server.to(`list:${listId}`).emit('todo:recurrence-deleted', { groupId, listId });
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
