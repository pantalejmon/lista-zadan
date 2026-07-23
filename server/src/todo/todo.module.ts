import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SharingModule } from '../sharing/sharing.module';
import { TodoEntity } from './infrastructure/todo.entity';
import { TodoRepositoryPort } from './domain/todo.repository.port';
import { TodoRepositoryAdapter } from './infrastructure/todo.repository.adapter';
import { TodoService } from './domain/todo.service';
import { TodoController } from './web/todo.controller';
import { TodosGateway } from './web/todos.gateway';
import { SharingService } from '../sharing/domain/sharing.service';

@Module({
  imports: [TypeOrmModule.forFeature([TodoEntity]), AuthModule, SharingModule],
  controllers: [TodoController],
  providers: [
    {
      provide: TodoRepositoryPort,
      useClass: TodoRepositoryAdapter,
    },
    {
      provide: TodoService,
      useFactory: (repo: TodoRepositoryPort, sharingService: SharingService) =>
        new TodoService(repo, sharingService),
      inject: [TodoRepositoryPort, SharingService],
    },
    // Must be a class provider (not useFactory): NestJS detects gateways via
    // wrapper.metatype, which for a factory has no @WebSocketGateway metadata —
    // so the socket.io server never gets assigned to @WebSocketServer() and
    // this.server is undefined. As a class provider, DI still injects the deps.
    TodosGateway,
  ],
  exports: [TodoService],
})
export class TodoModule {}
