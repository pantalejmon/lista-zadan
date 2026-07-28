import { randomUUID } from 'crypto';
import { RecipeIngredient } from './recipe-ingredient';
import { CreateRecipeDto } from '../web/dto/create-recipe.dto';
import { RecipeNutrition } from './nutrition';
import { RecipeIngredientDto } from '../web/dto/recipe-ingredient.dto';

export interface RecipeResponse {
  id: string;
  title: string;
  category?: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
  servings: number;
  createdAt: number;
  updatedAt: number;
  // Dokładane przez serwis (model nie zna produktów, a bez nich nie ma czego liczyć).
  nutrition?: RecipeNutrition;
}

export class Recipe {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly title: string,
    readonly category: string | null,
    readonly description: string | null,
    readonly instructions: string,
    readonly recipeIngredients: RecipeIngredient[],
    readonly servings: number,
    readonly createdAt: number,
    readonly updatedAt: number,
  ) {}

  static createFromDto(dto: CreateRecipeDto, householdId: string): Recipe {
    const now = Date.now();
    return new Recipe(
      randomUUID(),
      householdId,
      dto.title.trim(),
      dto.category?.trim() ? dto.category.trim() : null,
      dto.description?.trim() ? dto.description.trim() : null,
      dto.instructions.trim(),
      normaliseIngredients(dto.recipeIngredients),
      normaliseServings(dto.servings),
      now,
      now,
    );
  }

  update(dto: CreateRecipeDto): Recipe {
    return new Recipe(
      this.id,
      this.householdId,
      dto.title.trim(),
      dto.category?.trim() ? dto.category.trim() : null,
      dto.description?.trim() ? dto.description.trim() : null,
      dto.instructions.trim(),
      normaliseIngredients(dto.recipeIngredients),
      normaliseServings(dto.servings),
      this.createdAt,
      Date.now(),
    );
  }

  toResponse(): RecipeResponse {
    return {
      id: this.id,
      title: this.title,
      category: this.category ?? undefined,
      description: this.description ?? undefined,
      instructions: this.instructions,
      recipeIngredients: this.recipeIngredients,
      servings: this.servings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Przepis zawsze ma co najmniej jedną porcję — inaczej „na porcję" dzieliłoby przez zero.
function normaliseServings(servings: number | undefined): number {
  return typeof servings === 'number' && servings >= 1 ? Math.round(servings) : 1;
}

function normaliseIngredients(ingredients: RecipeIngredientDto[] | undefined): RecipeIngredient[] {
  if (!ingredients) {
    return [];
  }
  return ingredients
    .filter((i) => i.name?.trim())
    .map((i) => ({
      ingredientId: i.ingredientId?.trim() || i.name.trim(),
      name: i.name.trim(),
      quantity: typeof i.quantity === 'number' && Number.isFinite(i.quantity) ? i.quantity : 0,
      unit: i.unit?.trim() ?? '',
    }));
}
