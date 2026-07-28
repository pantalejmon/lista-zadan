import { computeRecipeNutrition, toBaseQuantity } from './nutrition';
import { Product } from './product.model';
import type { RecipeIngredient } from './recipe-ingredient';
import type { Nutrition } from './nutrition';

function product(name: string, baseUnit: 'g' | 'ml' | 'szt', nutrition: Nutrition | null): Product {
  return new Product(`id-${name}`, 'household', name, null, baseUnit, null, true, nutrition);
}

function ingredient(name: string, quantity: number, unit: string): RecipeIngredient {
  return { ingredientId: name, name, quantity, unit };
}

describe('toBaseQuantity', () => {
  it('przelicza jednostki w obrębie tej samej rodziny', () => {
    expect(toBaseQuantity(2, 'kg', 'g')).toBe(2000);
    expect(toBaseQuantity(1.5, 'l', 'ml')).toBe(1500);
    expect(toBaseQuantity(5, 'dag', 'g')).toBe(50);
  });

  it('traktuje pustą jednostkę jak jednostkę bazową', () => {
    expect(toBaseQuantity(120, '', 'g')).toBe(120);
  });

  it('nie zgaduje przy jednostce z innej rodziny ani przy nieznanej', () => {
    expect(toBaseQuantity(100, 'ml', 'g')).toBeNull();
    expect(toBaseQuantity(2, 'łyżki', 'ml')).toBeNull();
    expect(toBaseQuantity(1, 'szklanka', 'g')).toBeNull();
  });

  it('jest odporna na zapis z kropką i wielkie litery', () => {
    expect(toBaseQuantity(3, 'szt.', 'szt')).toBe(3);
    expect(toBaseQuantity(3, 'KG', 'g')).toBe(3000);
  });
});

describe('computeRecipeNutrition', () => {
  const flour = product('Mąka', 'g', { kcal: 364, protein: 10.3, fat: 1, carbs: 76.3, fiber: 2.7 });
  const egg = product('Jajko', 'szt', { kcal: 78, protein: 6.3, fat: 5.3, carbs: 0.6 });

  it('sumuje makro po składnikach — g na 100 g, sztuki na sztukę', () => {
    const result = computeRecipeNutrition(
      [ingredient('Mąka', 200, 'g'), ingredient('Jajko', 2, 'szt')],
      [flour, egg],
      1,
    );

    // 2 × 100 g mąki + 2 jajka
    expect(result.total.kcal).toBe(884);
    expect(result.total.protein).toBe(33.2);
    expect(result.coverage).toBe(1);
    expect(result.missing).toEqual([]);
  });

  it('dzieli na porcje', () => {
    const result = computeRecipeNutrition([ingredient('Mąka', 200, 'g')], [flour], 4);

    expect(result.total.kcal).toBe(728);
    expect(result.perServing.kcal).toBe(182);
  });

  it('nie wlicza składnika bez produktu, bez makro ani w nieprzeliczalnej jednostce', () => {
    const oil = product('Oliwa', 'ml', { kcal: 884, protein: 0, fat: 100, carbs: 0 });
    const rice = product('Ryż', 'g', null);

    const result = computeRecipeNutrition(
      [
        ingredient('Mąka', 100, 'g'),
        ingredient('Oliwa', 2, 'łyżki'), // jednostki nie da się przeliczyć
        ingredient('Ryż', 100, 'g'), // produkt bez makro
        ingredient('Kurkuma', 5, 'g'), // brak produktu w słowniku
      ],
      [flour, oil, rice],
      1,
    );

    expect(result.total.kcal).toBe(364);
    expect(result.coverage).toBe(0.25);
    expect(result.missing).toEqual(['Oliwa', 'Ryż', 'Kurkuma']);
  });

  it('pomija składniki „do smaku" bez psucia pokrycia', () => {
    const salt = product('Sól', 'g', { kcal: 0, protein: 0, fat: 0, carbs: 0, salt: 100 });

    const result = computeRecipeNutrition(
      [ingredient('Mąka', 100, 'g'), ingredient('Sól', 0, '')],
      [flour, salt],
      1,
    );

    expect(result.coverage).toBe(1);
    expect(result.missing).toEqual([]);
  });

  it('dopasowuje produkt po nazwie bez względu na wielkość liter', () => {
    const result = computeRecipeNutrition([ingredient('mĄkA', 100, 'g')], [flour], 1);

    expect(result.total.kcal).toBe(364);
  });

  it('sumuje błonnik tylko z produktów, które go podają', () => {
    const result = computeRecipeNutrition(
      [ingredient('Mąka', 100, 'g'), ingredient('Jajko', 1, 'szt')],
      [flour, egg],
      1,
    );

    // Jajko nie ma błonnika — liczy się tylko mąka, zamiast udawać zero.
    expect(result.total.fiber).toBe(2.7);
    expect(result.total.salt).toBeUndefined();
  });

  it('przepis bez policzalnych składników ma zerowe pokrycie, nie fałszywe 100%', () => {
    const result = computeRecipeNutrition([ingredient('Woda', 200, 'ml')], [], 2);

    expect(result.coverage).toBe(0);
    expect(result.total.kcal).toBe(0);
    expect(result.perServing.kcal).toBe(0);
  });
});
