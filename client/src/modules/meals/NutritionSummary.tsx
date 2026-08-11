import type { Nutrition, RecipeNutrition } from './meals';
import { ProteinSplit } from './ProteinSplit';

// Energia z 1 g makroskładnika (Atwater) — pasek pokazuje **udział energii**,
// nie udział gramów. Gram tłuszczu niesie ponad dwa razy więcej kcal niż gram
// węglowodanów, więc pasek gramowy zaniżałby tłuszcz i mówił nieprawdę o tym,
// z czego naprawdę jest ten posiłek.
const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 };

interface MacroSlice {
  key: 'protein' | 'fat' | 'carbs';
  label: string;
  grams: number;
  kcal: number;
  color: string;
}

function macroSlices(nutrition: Nutrition): MacroSlice[] {
  return [
    { key: 'protein', label: 'Białko', grams: nutrition.protein, kcal: nutrition.protein * KCAL_PER_GRAM.protein, color: 'var(--macro-protein)' },
    { key: 'fat', label: 'Tłuszcz', grams: nutrition.fat, kcal: nutrition.fat * KCAL_PER_GRAM.fat, color: 'var(--macro-fat)' },
    { key: 'carbs', label: 'Węglowodany', grams: nutrition.carbs, kcal: nutrition.carbs * KCAL_PER_GRAM.carbs, color: 'var(--macro-carbs)' },
  ];
}

function formatGrams(value: number): string {
  return `${value.toString().replace('.', ',')} g`;
}

// Makro przepisu: kcal na porcję jako liczba-bohater, pod spodem skład energii
// i uczciwa informacja o pokryciu. Bez tego ostatniego „450 kcal" policzone
// z połowy składników wygląda jak pewnik.
export function NutritionSummary({
  nutrition,
  servings,
  compact = false,
}: {
  nutrition: RecipeNutrition;
  servings: number;
  compact?: boolean;
}) {
  const nothingCounted = nutrition.coverage === 0;
  if (nothingCounted && nutrition.missing.length === 0) {
    return null;
  }

  const { perServing, total } = nutrition;
  const slices = macroSlices(perServing);
  const macroKcal = slices.reduce((sum, s) => sum + s.kcal, 0);

  return (
    <div
      className={`rounded-2xl border border-gray-100 dark:border-gray-800 ${
        // W modalu podglądu karta leży na białym tle, więc bierze odcień tła
        // strony; na stronie przepisu jest odwrotnie.
        compact ? 'bg-gray-50 dark:bg-gray-800/40 p-3' : 'bg-white dark:bg-gray-900 p-4'
      }`}
    >
      {nothingCounted ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nie da się policzyć makro — składniki nie mają dopasowanych produktów z wartościami odżywczymi.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Na porcję{servings > 1 ? ` (z ${servings})` : ''}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              całość {total.kcal} kcal
            </span>
          </div>

          <p className={`font-bold leading-none mt-1 ${compact ? 'text-2xl' : 'text-4xl'}`}>
            {perServing.kcal}
            <span className={`font-medium text-gray-400 dark:text-gray-500 ml-1.5 ${compact ? 'text-sm' : 'text-base'}`}>kcal</span>
          </p>

          {macroKcal > 0 && (
            <>
              {/* Skład energii — 100% stacked. Przerwa 2px w kolorze tła rozdziela
                  segmenty; zaokrąglone są tylko końce paska. */}
              <div className={`flex gap-0.5 ${compact ? 'mt-2.5' : 'mt-3.5'}`} aria-hidden="true">
                {slices
                  .filter((slice) => slice.kcal > 0)
                  .map((slice, index, visible) => (
                    <div
                      key={slice.key}
                      title={`${slice.label}: ${formatGrams(slice.grams)} (${Math.round((slice.kcal / macroKcal) * 100)}% energii)`}
                      className={`h-2.5 min-w-[2px] ${index === 0 ? 'rounded-l' : ''} ${index === visible.length - 1 ? 'rounded-r' : ''}`}
                      style={{
                        width: `${(slice.kcal / macroKcal) * 100}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  ))}
              </div>

              {/* Legenda niesie wartości, więc tożsamość nigdy nie zależy od
                  samego koloru (i działa jako tabela dla czytnika ekranu). */}
              <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${compact ? 'mt-2' : 'mt-3'}`}>
                {slices.map((slice) => (
                  <li key={slice.key} className="flex items-center gap-1.5 text-sm">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-gray-500 dark:text-gray-400">{slice.label}</span>
                    <span className="font-medium tabular-nums">{formatGrams(slice.grams)}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {Math.round((slice.kcal / macroKcal) * 100)}%
                    </span>
                  </li>
                ))}
                {perServing.fiber !== undefined && (
                  <li className="flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full shrink-0 border border-gray-300 dark:border-gray-600" />
                    <span className="text-gray-500 dark:text-gray-400">Błonnik</span>
                    <span className="font-medium tabular-nums">{formatGrams(perServing.fiber)}</span>
                  </li>
                )}
              </ul>
              <ProteinSplit nutrition={perServing} />
            </>
          )}
        </>
      )}

      {nutrition.coverage < 1 && nutrition.missing.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>
            Policzono {Math.round(nutrition.coverage * 100)}% składników. Bez:{' '}
            {nutrition.missing.join(', ')}.
          </span>
        </p>
      )}
    </div>
  );
}
