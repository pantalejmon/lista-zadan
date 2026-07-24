import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TodoModule } from '../todo/todo.module';
import { TodoService } from '../todo/domain/todo.service';
import { SharingModule } from '../sharing/sharing.module';
import { SharingService } from '../sharing/domain/sharing.service';
import { MealModule } from '../meal/meal.module';
import { MealService } from '../meal/domain/meal.service';
import { ApiTokenModule } from '../api-token/api-token.module';
import { McpService } from './domain/mcp.service';
import { McpController } from './web/mcp.controller';
import { buildTodoTools } from './domain/tools/todo.tools';
import { buildMealTools } from './domain/tools/meal.tools';

@Module({
  imports: [AuthModule, TodoModule, SharingModule, MealModule, ApiTokenModule],
  controllers: [McpController],
  providers: [
    {
      provide: McpService,
      useFactory: (todoService: TodoService, sharingService: SharingService, mealService: MealService) =>
        new McpService([
          ...buildTodoTools(todoService, sharingService),
          ...buildMealTools(mealService),
        ]),
      inject: [TodoService, SharingService, MealService],
    },
  ],
})
export class McpModule {}
