export interface RecipeIngredient {
  readonly ingredientId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unit: string;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
