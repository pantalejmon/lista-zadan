import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { TodoModule } from './todo/todo.module';
import { SharingModule } from './sharing/sharing.module';
import { CreateTodoTable1711612800000 } from './migration/1711612800000-CreateTodoTable';
import { CreateUserTable1711612900000 } from './migration/1711612900000-CreateUserTable';
import { AddUserIdToTodo1711613000000 } from './migration/1711613000000-AddUserIdToTodo';
import { CreateSharingTables1711613100000 } from './migration/1711613100000-CreateSharingTables';
import { AddListIdToTodo1711613200000 } from './migration/1711613200000-AddListIdToTodo';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: config.get<string>('database.type') as 'better-sqlite3',
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [
          CreateTodoTable1711612800000,
          CreateUserTable1711612900000,
          AddUserIdToTodo1711613000000,
          CreateSharingTables1711613100000,
          AddListIdToTodo1711613200000,
        ],
      }),
    }),
    AuthModule,
    TodoModule,
    SharingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
