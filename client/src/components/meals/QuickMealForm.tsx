import { useState } from 'react';
import type { MealStorage, Product, RecipeIngredient } from '../../lib/meals';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import { IconPlus, IconClose } from './icons';

interface Row {
  product: Product | null;
  quantity: string;
  unit: string;
}

// Posiłek doraźny — „jogurt i banan", który nie zasługuje na własny przepis.
// Składniki są opcjonalne, ale dopięte do słownika produktów, więc posiłek
// z nimi liczy się do zakupów, spiżarni i bilansu tak samo jak przepis.
export function QuickMealForm({
  storage,
  onSave,
}: {
  storage: MealStorage;
  onSave: (title: string, ingredients: RecipeIngredient[]) => void;
}) {
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<Row[]>([{ product: null, quantity: '', unit: '' }]);

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const withoutNutrition = rows
    .map((r) => r.product)
    .filter((p): p is Product => p !== null && !p.nutrition)
    .map((p) => p.name);

  const submit = () => {
    if (!title.trim()) {
      return;
    }
    const ingredients: RecipeIngredient[] = rows
      .filter((r) => r.product)
      .map((r) => ({
        ingredientId: r.product!.id,
        name: r.product!.name,
        quantity: parseFloat(r.quantity.replace(',', '.')) || 0,
        unit: r.unit.trim() || r.product!.baseUnit,
      }));
    onSave(title.trim(), ingredients);
  };

  return (
    <div className="p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Co jecie? (np. Jogurt z bananem)"
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Składniki (opcjonalnie) — z nimi posiłek policzy się do makro i spiżarni.
        </p>
        {/* Produkt bez wartości odżywczych wypada z bilansu po cichu — lepiej
            powiedzieć to teraz niż zostawić pusty Bilans do odkrycia (#111). */}
        {withoutNutrition.length > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-500 mb-2">
            Bez wartości odżywczych: {withoutNutrition.join(', ')} — ten posiłek nie wejdzie do bilansu,
            dopóki nie uzupełnisz makro w zakładce Produkty.
          </p>
        )}
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <IngredientAutocomplete
                  storage={storage}
                  value={row.product}
                  onChange={(product) => updateRow(index, { product, unit: row.unit || product.baseUnit })}
                  placeholder="Produkt..."
                />
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={row.quantity}
                onChange={(e) => updateRow(index, { quantity: e.target.value })}
                placeholder="ile"
                aria-label="Ilość"
                className="w-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="w-8 text-xs text-gray-400 shrink-0">{row.unit || row.product?.baseUnit || ''}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  className="p-1 text-gray-300 hover:text-red-500 shrink-0"
                  aria-label="Usuń składnik"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setRows([...rows, { product: null, quantity: '', unit: '' }])}
          className="mt-2 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <IconPlus className="w-3.5 h-3.5" /> Dodaj składnik
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!title.trim()}
        className="w-full bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
      >
        Wpisz do planera
      </button>
    </div>
  );
}
