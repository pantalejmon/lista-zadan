import { randomUUID } from 'crypto';
import { RecipeIngredient } from './recipe-ingredient';
import { CreateRecipeDto } from '../web/dto/create-recipe.dto';
import { RecipeIngredientDto } from '../web/dto/recipe-ingredient.dto';

export interface RecipeResponse {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
  createdAt: number;
  updatedAt: number;
}

export class Recipe {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly title: string,
    readonly description: string | null,
    readonly instructions: string,
    readonly recipeIngredients: RecipeIngredient[],
    readonly createdAt: number,
    readonly updatedAt: number,
  ) {}

  static createFromDto(dto: CreateRecipeDto, householdId: string): Recipe {
    const now = Date.now();
    return new Recipe(
      randomUUID(),
      householdId,
      dto.title.trim(),
      dto.description?.trim() ? dto.description.trim() : null,
      dto.instructions.trim(),
      normaliseIngredients(dto.recipeIngredients),
      now,
      now,
    );
  }

  update(dto: CreateRecipeDto): Recipe {
    return new Recipe(
      this.id,
      this.householdId,
      dto.title.trim(),
      dto.description?.trim() ? dto.description.trim() : null,
      dto.instructions.trim(),
      normaliseIngredients(dto.recipeIngredients),
      this.createdAt,
      Date.now(),
    );
  }

  toResponse(): RecipeResponse {
    return {
      id: this.id,
      title: this.title,
      description: this.description ?? undefined,
      instructions: this.instructions,
      recipeIngredients: this.recipeIngredients,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
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
