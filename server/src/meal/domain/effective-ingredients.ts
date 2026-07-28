import type { RecipeIngredient } from './recipe-ingredient';
import type { IngredientOverride } from './ingredient-override';

// Składniki wpisu planera po uwzględnieniu korekt zrobionych w slocie
// („w ten wtorek 4 jajka zamiast 2", „gotuję podwójną porcję").
//
// **To jedyne miejsce, w którym powstaje efektywna lista składników.** Muszą jej
// używać wszystkie trzy ścieżki: zakupy (`computeNeeds`), pętla „ugotowane →
// spiżarnia" i liczenie makro. Policzenie którejkolwiek z surowego przepisu
// rozjeżdża stan spiżarni.
//
// Nadpisanie ilości jest **bezwzględne** i wygrywa ze skalowaniem: skoro user
// wpisał „4 jajka", to znaczy 4 jajka, a nie 4 × mnożnik porcji.
export function effectiveIngredients(
  ingredients: readonly RecipeIngredient[],
  portionScale: number,
  overrides: readonly IngredientOverride[],
): RecipeIngredient[] {
  const scale = Number.isFinite(portionScale) && portionScale > 0 ? portionScale : 1;
  const byIngredient = new Map(overrides.map((o) => [o.ingredientId, o.quantity]));
  return ingredients.map((ingredient) => {
    const override = byIngredient.get(ingredient.ingredientId);
    return {
      ...ingredient,
      quantity: override ?? ingredient.quantity * scale,
    };
  });
}
