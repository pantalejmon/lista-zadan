import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { TodoModule } from './todo/todo.module';
import { SharingModule } from './sharing/sharing.module';
import { CreateTodoTable1711612800000 } from './migration/1711612800000-CreateTodoTable';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'database.sqlite',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: true,
      migrations: [CreateTodoTable1711612800000],
    }),
    AuthModule,
    TodoModule,
    SharingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
