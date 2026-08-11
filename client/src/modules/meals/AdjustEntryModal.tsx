import { useState } from 'react';
import type { IngredientOverride, PlannerEntry, RecipeIngredient } from './meals';
import { IconClose } from './icons';

const SCALE_STEPS = [0.5, 1, 1.5, 2, 2.5, 3];

function formatQuantity(value: number): string {
  return Number(value.toFixed(2)).toString().replace('.', ',');
}

// Korekta jednego posiłku: mnożnik porcji i ręczne ilości wybranych składników
// („w ten wtorek 4 jajka zamiast 2"). Sam przepis zostaje nietknięty.
//
// Bierze tytuł i składniki wprost, zamiast `Recipe`, bo skalowanie działa tak samo
// dla posiłku doraźnego — serwer liczy jedno i drugie przez `effectiveIngredients` (#113).
export function AdjustEntryModal({
  entry,
  title,
  ingredients,
  baseKcalPerServing,
  onSave,
  onClose,
}: {
  entry: PlannerEntry;
  title: string;
  ingredients: RecipeIngredient[];
  // Makro **nieskorygowanego** dania; `null`, gdy nie da się go policzyć.
  baseKcalPerServing: number | null;
  onSave: (portionScale: number, overrides: IngredientOverride[]) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(entry.portionScale ?? 1);
  const [overrides, setOverrides] = useState<Map<string, string>>(
    () => new Map((entry.ingredientOverrides ?? []).map((o) => [o.ingredientId, String(o.quantity)])),
  );

  const scaledQuantity = (base: number) => base * scale;

  const setOverride = (ingredientId: string, raw: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      if (raw.trim() === '') {
        next.delete(ingredientId);
      } else {
        next.set(ingredientId, raw);
      }
      return next;
    });
  };

  const reset = () => {
    setScale(1);
    setOverrides(new Map());
  };

  const save = () => {
    const parsed: IngredientOverride[] = [];
    for (const [ingredientId, raw] of overrides) {
      const quantity = parseFloat(raw.replace(',', '.'));
      if (Number.isFinite(quantity) && quantity >= 0) {
        parsed.push({ ingredientId, quantity });
      }
    }
    onSave(scale, parsed);
  };

  const modified = scale !== 1 || overrides.size > 0;
  // Podgląd kcal działa tylko dla mnożnika: przeliczenie ręcznych ilości wymaga
  // makro produktów, a te liczy serwer (jedno miejsce prawdy dla algorytmu).
  const previewKcal = baseKcalPerServing !== null ? Math.round(baseKcalPerServing * scale) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            {/* `break-words`, nie `truncate`: „Dopasuj: Zapiekanka z ku…" nie mówi,
                który posiłek się koryguje, a pod nagłówkiem jest miejsce. */}
            <h2 className="font-semibold break-words">Dopasuj: {title}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Zmienia tylko ten posiłek — przepis zostaje bez zmian.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
            aria-label="Zamknij"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          <section>
            {/* `flex-wrap`: przy 360 px „≈ 599 kcal/porcja" dopisane do mnożnika
                wychodziło poza prawą krawędź modala. Teraz podgląd kcal schodzi
                do własnego wiersza, zamiast rozpychać nagłówek. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 mb-2">
              <label htmlFor="portion-scale" className="text-sm font-medium">Ile porcji gotujesz</label>
              <span className="text-sm font-semibold tabular-nums">{formatQuantity(scale)}×</span>
              {previewKcal !== null && (
                <span className="w-full text-xs text-gray-400 dark:text-gray-500 sm:w-auto sm:text-sm">
                  ≈ {previewKcal} kcal/porcja
                </span>
              )}
            </div>
            <input
              id="portion-scale"
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
              {SCALE_STEPS.map((step) => <span key={step}>{formatQuantity(step)}×</span>)}
            </div>
          </section>

          <section>
            <p className="text-sm font-medium mb-1">Składniki</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              Puste pole = ilość wyjściowa przemnożona przez porcje. Wpisana liczba jest brana dosłownie.
            </p>
            <ul className="space-y-2">
              {ingredients.map((ingredient) => {
                const override = overrides.get(ingredient.ingredientId);
                return (
                  // Nazwa składnika ma własny wiersz na telefonie: obok pola
                  // ilości i jednostki zostawało z niej „Pierś z kurczaka …",
                  // więc nie było wiadomo, czego się dotyczy korekta. Od `sm`
                  // wzwyż wszystko mieści się w jednym rzędzie jak dotąd.
                  <li key={ingredient.ingredientId} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="min-w-0 text-sm break-words sm:flex-1 sm:truncate">{ingredient.name}</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={override ?? ''}
                        placeholder={formatQuantity(scaledQuantity(ingredient.quantity))}
                        onChange={(e) => setOverride(ingredient.ingredientId, e.target.value)}
                        aria-label={`Ilość: ${ingredient.name}`}
                        className={`w-24 bg-white dark:bg-gray-800 border rounded-xl px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          override !== undefined
                            ? 'border-primary-400 dark:border-primary-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                      />
                      <span className="w-10 text-xs text-gray-400 dark:text-gray-500 shrink-0">{ingredient.unit}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {entry.cooked && modified && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Posiłek jest odhaczony jako ugotowany — spiżarnia dostanie różnicę między starymi a nowymi ilościami.
            </p>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={reset}
            disabled={!modified}
            className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Przywróć domyślne
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
