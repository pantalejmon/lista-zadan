import { computeRecipeNutrition, toBaseQuantity } from './nutrition';
import { Product } from './product.model';
import type { RecipeIngredient } from './recipe-ingredient';
import type { Nutrition } from './nutrition';

function product(
  name: string,
  baseUnit: 'g' | 'ml' | 'szt',
  nutrition: Nutrition | null,
  origin: 'plant' | 'animal' | null = null,
): Product {
  return new Product(`id-${name}`, 'household', name, null, baseUnit, null, true, nutrition, origin);
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

  describe('rozbicie białka po pochodzeniu', () => {
    const tofu = product('Tofu', 'g', { kcal: 144, protein: 15.8, fat: 8.7, carbs: 2.8 }, 'plant');
    const chicken = product('Kurczak', 'g', { kcal: 165, protein: 31, fat: 3.6, carbs: 0 }, 'animal');

    it('sumuje białko roślinne i zwierzęce osobno', () => {
      const result = computeRecipeNutrition(
        [ingredient('Tofu', 100, 'g'), ingredient('Kurczak', 200, 'g')],
        [tofu, chicken],
        1,
      );

      expect(result.total.proteinPlant).toBe(15.8);
      expect(result.total.proteinAnimal).toBe(62);
      expect(result.total.protein).toBe(77.8);
    });

    // Kluczowe: produkt bez oznaczenia nie może wpaść do żadnego kubełka, bo
    // wtedy wykres kłamałby o tym, skąd naprawdę jest białko.
    it('białka z produktu bez oznaczenia nie przypisuje do żadnej grupy', () => {
      const result = computeRecipeNutrition(
        [ingredient('Tofu', 100, 'g'), ingredient('Mąka', 100, 'g')],
        [tofu, flour],
        1,
      );

      expect(result.total.proteinPlant).toBe(15.8);
      expect(result.total.proteinAnimal).toBeUndefined();
      // 15,8 (tofu) + 10,3 (mąka bez oznaczenia) — suma większa niż rozbicie.
      expect(result.total.protein).toBe(26.1);
    });

    it('bez oznaczonych produktów rozbicia nie ma wcale', () => {
      const result = computeRecipeNutrition([ingredient('Mąka', 100, 'g')], [flour], 1);

      expect(result.total.proteinPlant).toBeUndefined();
      expect(result.total.proteinAnimal).toBeUndefined();
    });

    it('rozbicie skaluje się na porcje razem z resztą makro', () => {
      const result = computeRecipeNutrition([ingredient('Kurczak', 200, 'g')], [chicken], 2);

      expect(result.perServing.proteinAnimal).toBe(31);
    });
  });

  it('przepis bez policzalnych składników ma zerowe pokrycie, nie fałszywe 100%', () => {
    const result = computeRecipeNutrition([ingredient('Woda', 200, 'ml')], [], 2);

    expect(result.coverage).toBe(0);
    expect(result.total.kcal).toBe(0);
    expect(result.perServing.kcal).toBe(0);
  });
});
