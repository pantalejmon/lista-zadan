import type { BaseUnit, Product } from './product.model';
import type { RecipeIngredient } from './recipe-ingredient';

// Wartości odżywcze produktu.
//
// **Jednostka odniesienia wynika z `baseUnit` produktu:**
// - `g`  → wartości na **100 g**
// - `ml` → wartości na **100 ml**
// - `szt` → wartości na **1 sztukę** (jajko, bułka, jogurt w kubku)
//
// kcal i trzy makroskładniki podaje się razem — etykieta na opakowaniu zawsze je
// ma, a policzenie przepisu z połowy danych dawałoby cicho zaniżony wynik.
// Błonnik i sól są opcjonalne.
export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  salt?: number;
  // Rozbicie białka po pochodzeniu produktu. Suma tych dwóch bywa **mniejsza**
  // niż `protein` — reszta pochodzi z produktów bez oznaczenia i to musi być
  // widoczne, a nie doklejone po cichu do jednego z kubełków.
  proteinPlant?: number;
  proteinAnimal?: number;
}

// Makro przepisu: suma po składnikach i wartość na porcję, razem z uczciwą miarą
// tego, ile z przepisu udało się w ogóle policzyć.
export interface RecipeNutrition {
  total: Nutrition;
  perServing: Nutrition;
  // Udział policzonych składników (0–1) wśród tych z podaną ilością. UI musi to
  // pokazać — inaczej „450 kcal" z połowy przepisu wygląda jak pewnik.
  coverage: number;
  // Nazwy składników, których nie policzono (brak produktu, brak makro albo
  // jednostka, której nie da się przeliczyć na bazową).
  missing: string[];
}

// Jednostki spotykane w przepisach → jednostka bazowa produktu + mnożnik.
// Świadomie NIE ma tu „łyżki", „szklanki" ani „szczypty": ich przeliczenie
// zależy od składnika, więc zamiast zgadywać, oznaczamy składnik jako
// niepoliczony i mówimy o tym wprost.
const UNIT_CONVERSIONS: Record<string, { baseUnit: BaseUnit; factor: number }> = {
  g: { baseUnit: 'g', factor: 1 },
  gram: { baseUnit: 'g', factor: 1 },
  gramy: { baseUnit: 'g', factor: 1 },
  gramów: { baseUnit: 'g', factor: 1 },
  dag: { baseUnit: 'g', factor: 10 },
  deka: { baseUnit: 'g', factor: 10 },
  kg: { baseUnit: 'g', factor: 1000 },
  kilogram: { baseUnit: 'g', factor: 1000 },
  mg: { baseUnit: 'g', factor: 0.001 },
  ml: { baseUnit: 'ml', factor: 1 },
  mililitry: { baseUnit: 'ml', factor: 1 },
  l: { baseUnit: 'ml', factor: 1000 },
  litr: { baseUnit: 'ml', factor: 1000 },
  litry: { baseUnit: 'ml', factor: 1000 },
  szt: { baseUnit: 'szt', factor: 1 },
  sztuka: { baseUnit: 'szt', factor: 1 },
  sztuki: { baseUnit: 'szt', factor: 1 },
  sztuk: { baseUnit: 'szt', factor: 1 },
};

// Przelicza ilość składnika na jednostkę bazową produktu. `null` = nie da się
// (nieznana jednostka albo jednostka z innej rodziny, np. ml dla produktu w g).
// Pusta jednostka oznacza „już w jednostce bazowej".
export function toBaseQuantity(quantity: number, unit: string, baseUnit: BaseUnit): number | null {
  if (!Number.isFinite(quantity)) {
    return null;
  }
  const key = unit.trim().toLowerCase().replace(/\.$/, '');
  if (!key) {
    return quantity;
  }
  const conversion = UNIT_CONVERSIONS[key];
  if (!conversion || conversion.baseUnit !== baseUnit) {
    return null;
  }
  return quantity * conversion.factor;
}

// Sumuje makro przepisu ze składników dopasowanych do produktów **po nazwie**
// (tak samo jak `computeNeeds` — jeden mechanizm dopasowania w całym module).
//
// Składnik bez podanej ilości („sól do smaku") jest pomijany i **nie** psuje
// pokrycia — brak ilości to świadomy zapis, a nie brakujące dane.
export function computeRecipeNutrition(
  ingredients: readonly RecipeIngredient[],
  products: readonly Product[],
  servings: number,
): RecipeNutrition {
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
  const total = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  let fiber: number | undefined;
  let salt: number | undefined;
  let proteinPlant: number | undefined;
  let proteinAnimal: number | undefined;
  let counted = 0;
  const missing: string[] = [];

  for (const ingredient of ingredients) {
    if (!(ingredient.quantity > 0)) {
      continue;
    }
    const product = byName.get(ingredient.name.toLowerCase());
    const baseQuantity = product
      ? toBaseQuantity(ingredient.quantity, ingredient.unit, product.baseUnit)
      : null;
    if (!product?.nutrition || baseQuantity === null) {
      missing.push(ingredient.name);
      continue;
    }
    // Wartości są na 100 g/ml albo na 1 sztukę — stąd dwa różne mnożniki.
    const factor = product.baseUnit === 'szt' ? baseQuantity : baseQuantity / 100;
    total.kcal += product.nutrition.kcal * factor;
    total.protein += product.nutrition.protein * factor;
    total.fat += product.nutrition.fat * factor;
    total.carbs += product.nutrition.carbs * factor;
    if (product.nutrition.fiber !== undefined) {
      fiber = (fiber ?? 0) + product.nutrition.fiber * factor;
    }
    if (product.nutrition.salt !== undefined) {
      salt = (salt ?? 0) + product.nutrition.salt * factor;
    }
    const protein = product.nutrition.protein * factor;
    if (product.origin === 'plant') {
      proteinPlant = (proteinPlant ?? 0) + protein;
    } else if (product.origin === 'animal') {
      proteinAnimal = (proteinAnimal ?? 0) + protein;
    }
    counted += 1;
  }

  const considered = counted + missing.length;
  const perServing = counted === 0 ? 0 : 1 / Math.max(1, servings);
  const summed: Nutrition = { ...total, fiber, salt, proteinPlant, proteinAnimal };
  return {
    total: roundNutrition(summed),
    perServing: roundNutrition(scaleNutrition(summed, perServing)),
    coverage: considered === 0 ? 0 : Math.round((counted / considered) * 100) / 100,
    missing,
  };
}

export function scaleNutrition(nutrition: Nutrition, factor: number): Nutrition {
  return {
    kcal: nutrition.kcal * factor,
    protein: nutrition.protein * factor,
    fat: nutrition.fat * factor,
    carbs: nutrition.carbs * factor,
    fiber: nutrition.fiber === undefined ? undefined : nutrition.fiber * factor,
    salt: nutrition.salt === undefined ? undefined : nutrition.salt * factor,
    proteinPlant: nutrition.proteinPlant === undefined ? undefined : nutrition.proteinPlant * factor,
    proteinAnimal: nutrition.proteinAnimal === undefined ? undefined : nutrition.proteinAnimal * factor,
  };
}

// Kalorie w pełnych jednostkach, makroskładniki do 0,1 g — tyle, ile ma sens
// przy danych z etykiety, i bez ogonów zmiennoprzecinkowych w JSON-ie.
function roundNutrition(nutrition: Nutrition): Nutrition {
  return {
    kcal: Math.round(nutrition.kcal),
    protein: round1(nutrition.protein),
    fat: round1(nutrition.fat),
    carbs: round1(nutrition.carbs),
    fiber: nutrition.fiber === undefined ? undefined : round1(nutrition.fiber),
    salt: nutrition.salt === undefined ? undefined : round1(nutrition.salt),
    proteinPlant: nutrition.proteinPlant === undefined ? undefined : round1(nutrition.proteinPlant),
    proteinAnimal: nutrition.proteinAnimal === undefined ? undefined : round1(nutrition.proteinAnimal),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
