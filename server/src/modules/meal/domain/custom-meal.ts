import type { RecipeIngredient } from './recipe-ingredient';

// Posiłek doraźny — „jogurt i banan”, który nie zasługuje na własny przepis,
// ale ma się liczyć do bilansu i do spiżarni. Wpis planera ma **albo** `recipeId`,
// **albo** taki obiekt.
export interface CustomMeal {
  readonly title: string;
  readonly ingredients: RecipeIngredient[];
}
