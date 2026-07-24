import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SharingModule } from '../sharing/sharing.module';
import { SharingService } from '../sharing/domain/sharing.service';
import { RecipeEntity } from './infrastructure/recipe.entity';
import { MealEntryEntity } from './infrastructure/meal-entry.entity';
import { MealShoppingItemEntity } from './infrastructure/meal-shopping-item.entity';
import { RecipeRepositoryPort } from './domain/recipe.repository.port';
import { RecipeRepositoryAdapter } from './infrastructure/recipe.repository.adapter';
import { MealEntryRepositoryPort } from './domain/meal-entry.repository.port';
import { MealEntryRepositoryAdapter } from './infrastructure/meal-entry.repository.adapter';
import { MealShoppingItemRepositoryPort } from './domain/meal-shopping-item.repository.port';
import { MealShoppingItemRepositoryAdapter } from './infrastructure/meal-shopping-item.repository.adapter';
import { MealService } from './domain/meal.service';
import { MealController } from './web/meal.controller';
import { MealGateway } from './web/meal.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecipeEntity, MealEntryEntity, MealShoppingItemEntity]),
    AuthModule,
    SharingModule,
  ],
  controllers: [MealController],
  providers: [
    { provide: RecipeRepositoryPort, useClass: RecipeRepositoryAdapter },
    { provide: MealEntryRepositoryPort, useClass: MealEntryRepositoryAdapter },
    { provide: MealShoppingItemRepositoryPort, useClass: MealShoppingItemRepositoryAdapter },
    MealGateway,
    {
      provide: MealService,
      useFactory: (
        recipeRepo: RecipeRepositoryPort,
        entryRepo: MealEntryRepositoryPort,
        shoppingRepo: MealShoppingItemRepositoryPort,
        sharingService: SharingService,
        gateway: MealGateway,
      ) => new MealService(recipeRepo, entryRepo, shoppingRepo, sharingService, gateway),
      inject: [
        RecipeRepositoryPort,
        MealEntryRepositoryPort,
        MealShoppingItemRepositoryPort,
        SharingService,
        MealGateway,
      ],
    },
  ],
})
export class MealModule {}
