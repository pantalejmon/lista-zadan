import { effectiveIngredients } from './effective-ingredients';
import type { RecipeIngredient } from './recipe-ingredient';

const RECIPE: RecipeIngredient[] = [
  { ingredientId: 'flour', name: 'Mąka', quantity: 250, unit: 'g' },
  { ingredientId: 'egg', name: 'Jajko', quantity: 2, unit: 'szt' },
];

describe('effectiveIngredients', () => {
  it('bez korekt zwraca składniki przepisu', () => {
    const result = effectiveIngredients(RECIPE, 1, []);

    expect(result.map((i) => i.quantity)).toEqual([250, 2]);
  });

  it('mnożnik porcji skaluje wszystkie ilości', () => {
    const result = effectiveIngredients(RECIPE, 2, []);

    expect(result.map((i) => i.quantity)).toEqual([500, 4]);
  });

  it('nadpisanie jest bezwzględne i wygrywa ze skalowaniem', () => {
    // „4 jajka" znaczy 4 jajka, a nie 4 × mnożnik.
    const result = effectiveIngredients(RECIPE, 2, [{ ingredientId: 'egg', quantity: 4 }]);

    expect(result.map((i) => i.quantity)).toEqual([500, 4]);
  });

  it('nadpisanie na zero zeruje składnik (a nie przywraca przepisu)', () => {
    const result = effectiveIngredients(RECIPE, 1, [{ ingredientId: 'egg', quantity: 0 }]);

    expect(result.map((i) => i.quantity)).toEqual([250, 0]);
  });

  it('nadpisanie nieistniejącego składnika nic nie psuje', () => {
    const result = effectiveIngredients(RECIPE, 1, [{ ingredientId: 'nie-ma', quantity: 99 }]);

    expect(result.map((i) => i.quantity)).toEqual([250, 2]);
  });

  it('broni się przed bezsensownym mnożnikiem zamiast zerować przepis', () => {
    expect(effectiveIngredients(RECIPE, 0, []).map((i) => i.quantity)).toEqual([250, 2]);
    expect(effectiveIngredients(RECIPE, Number.NaN, []).map((i) => i.quantity)).toEqual([250, 2]);
  });

  it('nie mutuje składników przepisu — przepis zostaje wzorcem', () => {
    effectiveIngredients(RECIPE, 3, [{ ingredientId: 'egg', quantity: 9 }]);

    expect(RECIPE.map((i) => i.quantity)).toEqual([250, 2]);
  });

  // Pętla „ugotowane → odejmij / cofnij → oddaj" liczy oba kierunki z tej samej
  // funkcji, więc musi wyjść dokładnie zero. To jest cały sens tego, że korekty
  // mają jedno miejsce prawdy.
  it('odjęcie i oddanie tych samych korekt znosi się do zera', () => {
    const taken = effectiveIngredients(RECIPE, 1.5, [{ ingredientId: 'egg', quantity: 5 }]);
    const restored = effectiveIngredients(RECIPE, 1.5, [{ ingredientId: 'egg', quantity: 5 }]);

    const net = taken.map((t, i) => t.quantity - restored[i].quantity);
    expect(net).toEqual([0, 0]);
  });
});
