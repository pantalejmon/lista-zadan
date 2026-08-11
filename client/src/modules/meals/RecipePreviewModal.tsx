import type { Recipe } from './meals';
import { IconClose } from './icons';
import { NutritionSummary } from './NutritionSummary';

// Read-only recipe preview shown from the planner (tapping a planned meal) so the
// user can check ingredients/instructions without leaving the plan. The planner
// entry already carries the full recipe, so no fetch is needed.
export function RecipePreviewModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-lg min-w-0">{recipe.title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
            aria-label="Zamknij"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {recipe.category && (
            <span className="inline-block mb-3 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              {recipe.category}
            </span>
          )}
          {recipe.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{recipe.description}</p>
          )}

          {recipe.nutrition && (
            <div className="mb-4">
              <NutritionSummary nutrition={recipe.nutrition} servings={recipe.servings} compact />
            </div>
          )}

          {recipe.recipeIngredients.length > 0 && (
            <section className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Składniki</h3>
              <ul className="bg-gray-50 dark:bg-gray-900 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
                {recipe.recipeIngredients.map((ri, i) => (
                  <li key={i} className="px-3 py-2 flex justify-between gap-3 text-sm">
                    <span className="min-w-0">{ri.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                      {ri.quantity || ''} {ri.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.instructions && (
            <section>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Instrukcje</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {recipe.instructions}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
