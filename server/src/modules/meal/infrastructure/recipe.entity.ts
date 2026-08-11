import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Recipe } from '../domain/recipe.model';
import { RecipeIngredient } from '../domain/recipe-ingredient';

@Entity('meal_recipe')
export class RecipeEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  title!: string;

  @Column('varchar', { nullable: true })
  category!: string | null;

  @Column('varchar', { nullable: true })
  description!: string | null;

  @Column('text')
  instructions!: string;

  @Column('text', { nullable: true })
  ingredients!: string | null;

  @Column('int', { default: 1 })
  servings!: number;

  @Column('bigint')
  createdAt!: number;

  @Column('bigint')
  updatedAt!: number;

  toDomain(): Recipe {
    return new Recipe(
      this.id,
      this.householdId,
      this.title,
      this.category,
      this.description,
      this.instructions,
      parseIngredients(this.ingredients),
      Number(this.servings ?? 1),
      Number(this.createdAt),
      Number(this.updatedAt),
    );
  }

  static fromDomain(recipe: Recipe): RecipeEntity {
    const entity = new RecipeEntity();
    entity.id = recipe.id;
    entity.householdId = recipe.householdId;
    entity.title = recipe.title;
    entity.category = recipe.category;
    entity.description = recipe.description;
    entity.instructions = recipe.instructions;
    entity.ingredients = JSON.stringify(recipe.recipeIngredients);
    entity.servings = recipe.servings;
    entity.createdAt = recipe.createdAt;
    entity.updatedAt = recipe.updatedAt;
    return entity;
  }
}

function parseIngredients(raw: string | null): RecipeIngredient[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (i): i is RecipeIngredient =>
        typeof i === 'object' &&
        i !== null &&
        typeof (i as RecipeIngredient).name === 'string' &&
        typeof (i as RecipeIngredient).unit === 'string',
    );
  } catch {
    return [];
  }
}
