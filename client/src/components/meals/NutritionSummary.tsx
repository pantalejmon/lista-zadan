import type { RecipeNutrition } from '../../lib/meals';

// Makro przepisu: na porcję (najczęściej to interesuje) + całość, plus uczciwa
// informacja o pokryciu. Bez tego ostatniego „450 kcal" policzone z połowy
// składników wygląda jak pewnik.
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
  const incomplete = nutrition.coverage < 1;

  return (
    <div className={`rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 ${compact ? 'p-3' : 'p-4'}`}>
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
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              całość {total.kcal} kcal
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums mt-0.5">
            {perServing.kcal} <span className="text-base font-medium text-gray-400">kcal</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 tabular-nums mt-1">
            B {perServing.protein} g · T {perServing.fat} g · W {perServing.carbs} g
            {perServing.fiber !== undefined ? ` · błonnik ${perServing.fiber} g` : ''}
          </p>
        </>
      )}

      {incomplete && nutrition.missing.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          Policzono {Math.round(nutrition.coverage * 100)}% składników. Nie policzono:{' '}
          {nutrition.missing.join(', ')}.
        </p>
      )}
    </div>
  );
}
