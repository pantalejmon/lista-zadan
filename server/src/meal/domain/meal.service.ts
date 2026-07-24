import { NotFoundException } from '@nestjs/common';
import type { ListRole } from '../../sharing/domain/list-role';
import { SharingService } from '../../sharing/domain/sharing.service';
import { Recipe, type RecipeResponse } from './recipe.model';
import { MealEntry, type MealEntryResponse } from './meal-entry.model';
import { MealShoppingItem, type MealShoppingItemResponse } from './meal-shopping-item.model';
import { RecipeRepositoryPort } from './recipe.repository.port';
import { MealEntryRepositoryPort } from './meal-entry.repository.port';
import { MealShoppingItemRepositoryPort } from './meal-shopping-item.repository.port';
import { CreateRecipeDto } from '../web/dto/create-recipe.dto';
import { CreateEntryDto } from '../web/dto/create-entry.dto';

const WRITE_ROLES: ListRole[] = ['owner', 'editor'];
const READ_ROLES: ListRole[] = ['owner', 'editor', 'viewer'];

export interface PlannerEntryResponse extends MealEntryResponse {
  recipe: RecipeResponse | null;
}

export class MealService {
  constructor(
    private readonly recipeRepo: RecipeRepositoryPort,
    private readonly entryRepo: MealEntryRepositoryPort,
    private readonly shoppingRepo: MealShoppingItemRepositoryPort,
    private readonly sharingService: SharingService,
  ) {}

  // ---- recipes ----

  async getRecipes(householdId: string, userId: string): Promise<RecipeResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const recipes = await this.recipeRepo.findByHousehold(householdId);
    return recipes
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => r.toResponse());
  }

  async getRecipe(id: string, userId: string): Promise<RecipeResponse> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recipe.householdId, userId, READ_ROLES);
    return recipe.toResponse();
  }

  async createRecipe(dto: CreateRecipeDto, householdId: string, userId: string): Promise<RecipeResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const recipe = Recipe.createFromDto(dto, householdId);
    await this.recipeRepo.save(recipe);
    return recipe.toResponse();
  }

  async updateRecipe(id: string, dto: CreateRecipeDto, userId: string): Promise<RecipeResponse> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recipe.householdId, userId, WRITE_ROLES);
    const updated = recipe.update(dto);
    await this.recipeRepo.update(updated);
    return updated.toResponse();
  }

  async deleteRecipe(id: string, userId: string): Promise<void> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recipe.householdId, userId, WRITE_ROLES);
    await this.entryRepo.deleteByRecipe(id);
    await this.recipeRepo.delete(id);
  }

  async searchIngredients(householdId: string, userId: string, query: string): Promise<string[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const recipes = await this.recipeRepo.findByHousehold(householdId);
    const q = query.trim().toLowerCase();
    const names = new Map<string, string>();
    for (const recipe of recipes) {
      for (const ri of recipe.recipeIngredients) {
        const key = ri.name.toLowerCase();
        if (!names.has(key) && (!q || key.includes(q))) {
          names.set(key, ri.name);
        }
      }
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b, 'pl')).slice(0, 8);
  }

  // ---- planner ----

  async getWeek(householdId: string, userId: string, weekStart: string): Promise<PlannerEntryResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const entries = await this.entryRepo.findByWeek(householdId, weekStart);
    const result: PlannerEntryResponse[] = [];
    for (const entry of entries) {
      const recipe = await this.recipeRepo.findById(entry.recipeId);
      result.push({ ...entry.toResponse(), recipe: recipe ? recipe.toResponse() : null });
    }
    return result;
  }

  async addEntry(
    householdId: string,
    userId: string,
    dto: CreateEntryDto,
  ): Promise<MealEntryResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const existing = await this.entryRepo.findSlot(
      householdId,
      dto.weekStart,
      dto.dayOfWeek,
      dto.mealType,
    );
    if (existing) {
      const updated = existing.withRecipe(dto.recipeId);
      await this.entryRepo.update(updated);
      return updated.toResponse();
    }
    const entry = MealEntry.create(householdId, dto.weekStart, dto.dayOfWeek, dto.mealType, dto.recipeId);
    await this.entryRepo.save(entry);
    return entry.toResponse();
  }

  async removeEntry(id: string, userId: string): Promise<void> {
    const entry = await this.entryRepo.findById(id);
    if (!entry) {
      return;
    }
    await this.sharingService.assertHouseholdPermission(entry.householdId, userId, WRITE_ROLES);
    await this.entryRepo.delete(id);
  }

  // ---- shopping ----

  async getShopping(householdId: string, userId: string): Promise<MealShoppingItemResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const items = await this.shoppingRepo.findByHousehold(householdId);
    return items.sort((a, b) => a.createdAt - b.createdAt).map((i) => i.toResponse());
  }

  async addShoppingItem(householdId: string, userId: string, name: string): Promise<MealShoppingItemResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const item = MealShoppingItem.create(householdId, name);
    await this.shoppingRepo.save(item);
    return item.toResponse();
  }

  async toggleShoppingItem(id: string, userId: string, isChecked: boolean): Promise<MealShoppingItemResponse> {
    const item = await this.findShoppingItemOrThrow(id);
    await this.sharingService.assertHouseholdPermission(item.householdId, userId, WRITE_ROLES);
    const updated = item.withChecked(isChecked);
    await this.shoppingRepo.update(updated);
    return updated.toResponse();
  }

  async removeShoppingItem(id: string, userId: string): Promise<void> {
    const item = await this.findShoppingItemOrThrow(id);
    await this.sharingService.assertHouseholdPermission(item.householdId, userId, WRITE_ROLES);
    await this.shoppingRepo.delete(id);
  }

  async generateFromPlan(householdId: string, userId: string, weekStart: string): Promise<number> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const entries = await this.entryRepo.findByWeek(householdId, weekStart);
    const aggregated = new Map<string, { name: string; quantity: number; unit: string }>();
    for (const entry of entries) {
      const recipe = await this.recipeRepo.findById(entry.recipeId);
      if (!recipe) {
        continue;
      }
      for (const ri of recipe.recipeIngredients) {
        const key = `${ri.name.toLowerCase()}__${ri.unit}`;
        const current = aggregated.get(key);
        if (current) {
          current.quantity += ri.quantity;
        } else {
          aggregated.set(key, { name: ri.name, quantity: ri.quantity, unit: ri.unit });
        }
      }
    }
    const items = [...aggregated.values()].map((a) =>
      MealShoppingItem.create(householdId, a.name, a.quantity || null, a.unit || null),
    );
    await this.shoppingRepo.saveMany(items);
    return items.length;
  }

  // ---- internals ----

  private async findRecipeOrThrow(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepo.findById(id);
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  private async findShoppingItemOrThrow(id: string): Promise<MealShoppingItem> {
    const item = await this.shoppingRepo.findById(id);
    if (!item) {
      throw new NotFoundException(`Shopping item ${id} not found`);
    }
    return item;
  }
}
