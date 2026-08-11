import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '@platform/auth/auth.module';
import { SharingModule } from '@platform/sharing/sharing.module';
import { TodoEntity } from './infrastructure/todo.entity';
import { TodoRepositoryPort } from './domain/todo.repository.port';
import { TodoRepositoryAdapter } from './infrastructure/todo.repository.adapter';
import { TodoService } from './domain/todo.service';
import { TodoController } from './web/todo.controller';
import { TodosGateway } from './web/todos.gateway';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { UserRepositoryPort } from '@platform/auth/domain/user.repository.port';
import { RateLimiterGuard } from './web/rate-limiter.guard';

import { McpRegistryModule } from '@platform/mcp/mcp-registry.module';
import { McpToolRegistry } from '@platform/mcp/domain/mcp-tool.registry';
import { buildTodoTools } from './mcp/todo.tools';

@Module({
  imports: [TypeOrmModule.forFeature([TodoEntity]), AuthModule, SharingModule, McpRegistryModule],
  controllers: [TodoController],
  providers: [
    {
      provide: TodoRepositoryPort,
      useClass: TodoRepositoryAdapter,
    },
    {
      provide: TodoService,
      useFactory: (
        repo: TodoRepositoryPort,
        sharingService: SharingService,
        userRepo: UserRepositoryPort,
        configService: ConfigService,
        gateway: TodosGateway,
      ) => new TodoService(repo, sharingService, userRepo, configService, gateway),
      inject: [TodoRepositoryPort, SharingService, UserRepositoryPort, ConfigService, TodosGateway],
    },
    TodosGateway,
    RateLimiterGuard,
  ],
  exports: [TodoService],
})
export class TodoModule implements OnModuleInit {
  constructor(
    private readonly registry: McpToolRegistry,
    private readonly todoService: TodoService,
    private readonly sharingService: SharingService,
  ) {}

  // Moduł sam wnosi swoje narzędzia MCP — sterowanie agentem to kolejne
  // wejście do tej samej logiki, obok kontrolera REST i gatewaya.
  onModuleInit(): void {
    this.registry.register(buildTodoTools(this.todoService, this.sharingService));
  }
}
