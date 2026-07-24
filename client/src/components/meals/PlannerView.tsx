import { useState, useEffect, useCallback } from 'react';
import {
  getWeek,
  getRecipes,
  addEntry,
  removeEntry,
  getMonday,
  shiftWeek,
  weekLabel,
  MEAL_TYPES,
  WEEK_DAYS,
  type PlannerEntry,
  type Recipe,
  type MealType,
} from '../../lib/meals';

export function PlannerView() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pickerSlot, setPickerSlot] = useState<{ day: number; meal: MealType } | null>(null);

  const load = useCallback(async () => {
    setEntries(await getWeek(weekStart));
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getRecipes().then(setRecipes); }, []);

  const getEntry = (day: number, mealType: MealType) =>
    entries.find((e) => e.dayOfWeek === day && e.mealType === mealType);

  const handleAdd = async (recipeId: string) => {
    if (!pickerSlot) {
      return;
    }
    await addEntry(weekStart, recipeId, pickerSlot.day, pickerSlot.meal);
    setPickerSlot(null);
    load();
  };

  const handleRemove = async (id: string) => {
    await removeEntry(id);
    load();
  };

  const openPicker = async (day: number, meal: MealType) => {
    setRecipes(await getRecipes());
    setPickerSlot({ day, meal });
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 active:scale-95 transition-all"
          aria-label="Poprzedni tydzień"
        >◀</button>
        <div className="text-center">
          <h1 className="text-lg font-bold">Planer posiłków</h1>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            {weekLabel(weekStart)}
          </button>
        </div>
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 active:scale-95 transition-all"
          aria-label="Następny tydzień"
        >▶</button>
      </div>

      {/* Calendar grid — desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-28 text-left text-xs font-medium text-gray-400 pb-2 pl-2">Posiłek</th>
              {WEEK_DAYS.map((d, i) => {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                return (
                  <th key={d} className="text-center text-xs font-medium text-gray-600 dark:text-gray-300 pb-2 px-1">
                    <div>{d}</div>
                    <div className="text-gray-400">{date.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map(({ type, label }) => (
              <tr key={type} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 pl-2 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</td>
                {WEEK_DAYS.map((_, dayIdx) => {
                  const entry = getEntry(dayIdx, type);
                  return (
                    <td key={dayIdx} className="py-1 px-1 align-top">
                      {entry ? (
                        <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 rounded-lg p-1.5 text-xs group relative min-h-12">
                          <p className="font-medium text-primary-900 dark:text-primary-200 truncate pr-3">
                            {entry.recipe?.title ?? '—'}
                          </p>
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="absolute top-1 right-1 text-primary-400 hover:text-red-500 hidden group-hover:block"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openPicker(dayIdx, type)}
                          className="w-full h-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-gray-300 dark:text-gray-600 hover:text-primary-500 text-xl transition-colors"
                        >+</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: day list */}
      <div className="md:hidden space-y-4">
        {WEEK_DAYS.map((dayLabel, dayIdx) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + dayIdx);
          return (
            <div key={dayIdx} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="font-semibold">{dayLabel}</span>
                <span className="text-sm text-gray-400">{date.getDate()}.{String(date.getMonth() + 1).padStart(2, '0')}</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {MEAL_TYPES.map(({ type, label }) => {
                  const entry = getEntry(dayIdx, type);
                  return (
                    <div key={type} className="px-4 py-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                      {entry ? (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="text-sm font-medium truncate">{entry.recipe?.title ?? '—'}</span>
                          <button onClick={() => handleRemove(entry.id)} className="text-gray-300 hover:text-red-500 ml-2 shrink-0">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openPicker(dayIdx, type)}
                          className="flex-1 text-left text-sm text-gray-300 dark:text-gray-600 hover:text-primary-600 dark:hover:text-primary-400 py-1"
                        >
                          + Dodaj
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe picker modal */}
      {pickerSlot && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold">Wybierz przepis</h2>
              <button onClick={() => setPickerSlot(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
            </div>
            {recipes.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">
                Brak przepisów. Dodaj przepis w zakładce „Przepisy”.
              </p>
            ) : (
              <ul className="overflow-y-auto flex-1 p-2">
                {recipes.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => handleAdd(r.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 text-sm"
                    >
                      <span className="font-medium">{r.title}</span>
                      <span className="ml-2 text-gray-400 text-xs">{r.recipeIngredients.length} skł.</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
