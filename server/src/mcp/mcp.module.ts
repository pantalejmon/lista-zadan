import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TodoModule } from '../todo/todo.module';
import { TodoService } from '../todo/domain/todo.service';
import { SharingModule } from '../sharing/sharing.module';
import { SharingService } from '../sharing/domain/sharing.service';
import { MealModule } from '../meal/meal.module';
import { MealService } from '../meal/domain/meal.service';
import { HomeModule } from '../home/home.module';
import { HomeService } from '../home/domain/home.service';
import { FinanceModule } from '../finance/finance.module';
import { FinanceService } from '../finance/domain/finance.service';
import { ApiTokenModule } from '../api-token/api-token.module';
import { McpService } from './domain/mcp.service';
import { McpController } from './web/mcp.controller';
import { buildTodoTools } from './domain/tools/todo.tools';
import { buildMealTools } from './domain/tools/meal.tools';
import { buildHouseholdTools } from './domain/tools/household.tools';
import { buildHomeTools } from './domain/tools/home.tools';
import { buildFinanceTools } from './domain/tools/finance.tools';
import { buildSettingsTools } from './domain/tools/settings.tools';
import { AuthService } from '../auth/domain/auth.service';

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
