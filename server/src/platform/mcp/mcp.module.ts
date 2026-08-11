import { Module } from '@nestjs/common';
import { AuthModule } from '@platform/auth/auth.module';
import { TodoModule } from '@modules/todo/todo.module';
import { TodoService } from '@modules/todo/domain/todo.service';
import { SharingModule } from '@platform/sharing/sharing.module';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { MealModule } from '@modules/meal/meal.module';
import { MealService } from '@modules/meal/domain/meal.service';
import { HomeModule } from '@modules/home/home.module';
import { HomeService } from '@modules/home/domain/home.service';
import { FinanceModule } from '@modules/finance/finance.module';
import { FinanceService } from '@modules/finance/domain/finance.service';
import { ApiTokenModule } from '@platform/api-token/api-token.module';
import { McpService } from './domain/mcp.service';
import { McpController } from './web/mcp.controller';
import { buildTodoTools } from './domain/tools/todo.tools';
import { buildMealTools } from './domain/tools/meal.tools';
import { buildHouseholdTools } from './domain/tools/household.tools';
import { buildHomeTools } from './domain/tools/home.tools';
import { buildFinanceTools } from './domain/tools/finance.tools';
import { buildSettingsTools } from './domain/tools/settings.tools';
import { AuthService } from '@platform/auth/domain/auth.service';

@Module({
  imports: [AuthModule, TodoModule, SharingModule, MealModule, HomeModule, FinanceModule, ApiTokenModule],
  controllers: [McpController],
  providers: [
    {
      provide: McpService,
      useFactory: (
        todoService: TodoService,
        sharingService: SharingService,
        mealService: MealService,
        homeService: HomeService,
        financeService: FinanceService,
        authService: AuthService,
      ) =>
        new McpService([
          ...buildTodoTools(todoService, sharingService),
          ...buildMealTools(mealService),
          ...buildHouseholdTools(sharingService, mealService, todoService),
          ...buildHomeTools(homeService),
          ...buildFinanceTools(financeService),
          ...buildSettingsTools(authService),
        ]),
      inject: [TodoService, SharingService, MealService, HomeService, FinanceService, AuthService],
    },
  ],
})
export class McpModule {}
