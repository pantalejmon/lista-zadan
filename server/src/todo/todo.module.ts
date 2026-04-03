import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { SharingModule } from '../sharing/sharing.module';
import { TodoEntity } from './infrastructure/todo.entity';
import { TodoRepositoryPort } from './domain/todo.repository.port';
import { TodoRepositoryAdapter } from './infrastructure/todo.repository.adapter';
import { TodoService } from './domain/todo.service';
import { TodoController } from './web/todo.controller';
import { TodosGateway } from './web/todos.gateway';
import { SharingService } from '../sharing/domain/sharing.service';
import { UserRepositoryPort } from '../auth/domain/user.repository.port';
import { RateLimiterGuard } from './web/rate-limiter.guard';

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
      useFactory: (
        repo: TodoRepositoryPort,
        sharingService: SharingService,
        userRepo: UserRepositoryPort,
        configService: ConfigService,
      ) => new TodoService(repo, sharingService, userRepo, configService),
      inject: [TodoRepositoryPort, SharingService, UserRepositoryPort, ConfigService],
    },
    TodosGateway,
    RateLimiterGuard,
  ],
  exports: [TodoService],
})
export class TodoModule {}
