import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@platform/auth/auth.module';
import { SharingModule } from '@platform/sharing/sharing.module';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { RecipeEntity } from './infrastructure/recipe.entity';
import { MealEntryEntity } from './infrastructure/meal-entry.entity';
import { MealShoppingItemEntity } from './infrastructure/meal-shopping-item.entity';
import { ProductEntity } from './infrastructure/product.entity';
import { NutritionGoalEntity } from './infrastructure/nutrition-goal.entity';
import { NutritionGoalRepositoryPort } from './domain/nutrition-goal.repository.port';
import { NutritionGoalRepositoryAdapter } from './infrastructure/nutrition-goal.repository.adapter';
import { PantryItemEntity } from './infrastructure/pantry-item.entity';
import { RecipeRepositoryPort } from './domain/recipe.repository.port';
import { RecipeRepositoryAdapter } from './infrastructure/recipe.repository.adapter';
import { MealEntryRepositoryPort } from './domain/meal-entry.repository.port';
import { MealEntryRepositoryAdapter } from './infrastructure/meal-entry.repository.adapter';
import { MealShoppingItemRepositoryPort } from './domain/meal-shopping-item.repository.port';
import { MealShoppingItemRepositoryAdapter } from './infrastructure/meal-shopping-item.repository.adapter';
import { ProductRepositoryPort } from './domain/product.repository.port';
import { ProductRepositoryAdapter } from './infrastructure/product.repository.adapter';
import { PantryItemRepositoryPort } from './domain/pantry-item.repository.port';
import { PantryItemRepositoryAdapter } from './infrastructure/pantry-item.repository.adapter';
import { MealService } from './domain/meal.service';
import { MealController } from './web/meal.controller';
import { MealGateway } from './web/meal.gateway';

import { TodoModule } from '@modules/todo/todo.module';
import { TodoService } from '@modules/todo/domain/todo.service';
import { McpRegistryModule } from '@platform/mcp/mcp-registry.module';
import { McpToolRegistry } from '@platform/mcp/domain/mcp-tool.registry';
import { buildMealTools } from './mcp/meal.tools';
import { buildShoppingExportTools } from './mcp/shopping-export.tools';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecipeEntity,
      MealEntryEntity,
      MealShoppingItemEntity,
      ProductEntity,
      PantryItemEntity,
      NutritionGoalEntity,
    ]),
    AuthModule,
    SharingModule,
    McpRegistryModule,
    TodoModule,
  ],
  controllers: [MealController],
  providers: [
    { provide: RecipeRepositoryPort, useClass: RecipeRepositoryAdapter },
    { provide: MealEntryRepositoryPort, useClass: MealEntryRepositoryAdapter },
    { provide: MealShoppingItemRepositoryPort, useClass: MealShoppingItemRepositoryAdapter },
    { provide: ProductRepositoryPort, useClass: ProductRepositoryAdapter },
    { provide: PantryItemRepositoryPort, useClass: PantryItemRepositoryAdapter },
    { provide: NutritionGoalRepositoryPort, useClass: NutritionGoalRepositoryAdapter },
    MealGateway,
    {
      provide: MealService,
      useFactory: (
        recipeRepo: RecipeRepositoryPort,
        entryRepo: MealEntryRepositoryPort,
        shoppingRepo: MealShoppingItemRepositoryPort,
        productRepo: ProductRepositoryPort,
        pantryRepo: PantryItemRepositoryPort,
        goalRepo: NutritionGoalRepositoryPort,
        sharingService: SharingService,
        gateway: MealGateway,
      ) =>
        new MealService(
          recipeRepo,
          entryRepo,
          shoppingRepo,
          productRepo,
          pantryRepo,
          goalRepo,
          sharingService,
          gateway,
        ),
      inject: [
        RecipeRepositoryPort,
        MealEntryRepositoryPort,
        MealShoppingItemRepositoryPort,
        ProductRepositoryPort,
        PantryItemRepositoryPort,
        NutritionGoalRepositoryPort,
        SharingService,
        MealGateway,
      ],
    },
  ],
  exports: [MealService],
})
export class MealModule implements OnModuleInit {
  constructor(
    private readonly registry: McpToolRegistry,
    private readonly mealService: MealService,
    private readonly todoService: TodoService,
  ) {}

  // Moduł sam wnosi swoje narzędzia MCP — sterowanie agentem to kolejne
  // wejście do tej samej logiki, obok kontrolera REST i gatewaya.
  onModuleInit(): void {
    this.registry.register(buildMealTools(this.mealService));
    // Eksport zakupów do listy zadań — Posiłki czytają swoje, a Zadania
    // dostają gotowy wpis przez swój publiczny serwis.
    this.registry.register(buildShoppingExportTools(this.mealService, this.todoService));
  }
}
