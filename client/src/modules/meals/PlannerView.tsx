import { useState, useEffect, useCallback } from 'react';
import {
  getMonday,
  shiftWeek,
  weekLabel,
  MEAL_TYPES,
  WEEK_DAYS,
  type MealStorage,
  type PlannerEntry,
  type Recipe,
  type MealType,
  type RecipeIngredient,
} from './meals';
import { IconChevronLeft, IconChevronRight, IconClose, IconPlus, IconCheck } from './icons';
import { RecipePreviewModal } from './RecipePreviewModal';
import { ParticipantsBadges, ParticipantsPicker } from './ParticipantsPicker';
import { AdjustEntryModal } from './AdjustEntryModal';
import { QuickMealForm } from './QuickMealForm';
import { getHouseholdMembers } from '@platform/households/householdsApi';
import type { HouseholdMember } from '@platform/households/household.types';

function entryTitle(entry: PlannerEntry): string {
  return entry.recipe?.title ?? entry.custom?.title ?? 'Posiłek';
}

// Składniki **przed** korektami ze slotu — z przepisu albo z posiłku doraźnego.
// Modal korekty potrzebuje ich jako punktu odniesienia dla mnożnika.
function baseIngredients(entry: PlannerEntry): RecipeIngredient[] {
  return entry.recipe?.recipeIngredients ?? entry.custom?.ingredients ?? [];
}

// kcal jednej porcji dania przed korektami. Przepis niesie je wprost; posiłek doraźny
// zna tylko makro **po** korektach, więc odkręcamy sam mnożnik. Przy ręcznych
// nadpisaniach ilości nie da się tego zrobić uczciwie — wtedy podglądu nie ma.
function baseKcalPerServing(entry: PlannerEntry): number | null {
  const fromRecipe = entry.recipe?.nutrition;
  if (fromRecipe && fromRecipe.coverage > 0) {
    return Math.round(fromRecipe.perServing.kcal);
  }
  const own = entry.nutrition;
  if (!own || own.coverage === 0 || (entry.ingredientOverrides?.length ?? 0) > 0) {
    return null;
  }
  return Math.round(own.perServing.kcal / (entry.portionScale || 1));
}

// Krótki znacznik korekty na kaflu — user musi widzieć, że ten posiłek liczy się
// inaczej niż przepis (do zakupów i spiżarni też).
function adjustmentLabel(entry: PlannerEntry): string | null {
  const scale = entry.portionScale ?? 1;
  const overrides = entry.ingredientOverrides?.length ?? 0;
  if (scale !== 1) {
    return `${Number(scale.toFixed(2)).toString().replace('.', ',')}×`;
  }
  return overrides > 0 ? '≠' : null;
}

export function PlannerView({
  storage,
  householdId,
  liveKey = 0,
}: {
  storage: MealStorage;
  householdId: string;
  liveKey?: number;
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pickerSlot, setPickerSlot] = useState<{ day: number; meal: MealType } | null>(null);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [participantsFor, setParticipantsFor] = useState<PlannerEntry | null>(null);
  const [adjusting, setAdjusting] = useState<PlannerEntry | null>(null);
  const [pickerTab, setPickerTab] = useState<'recipe' | 'quick'>('recipe');

  const load = useCallback(async () => {
    setEntries(await storage.getWeek(weekStart));
  }, [storage, weekStart]);

  useEffect(() => { load(); }, [load, liveKey]);
  useEffect(() => { storage.getRecipes().then(setRecipes); }, [storage, liveKey]);
  useEffect(() => { getHouseholdMembers(householdId).then(setMembers).catch(() => setMembers([])); }, [householdId]);

  const getEntry = (day: number, mealType: MealType) =>
    entries.find((e) => e.dayOfWeek === day && e.mealType === mealType);

  const handleAdd = async (recipeId: string) => {
    if (!pickerSlot) {
      return;
    }
    await storage.addEntry(weekStart, recipeId, pickerSlot.day, pickerSlot.meal);
    setPickerSlot(null);
    load();
  };

  const handleRemove = async (id: string) => {
    await storage.removeEntry(id);
    load();
  };

  const handleCook = async (entry: PlannerEntry) => {
    await storage.setCooked(entry.id, !entry.cooked);
    load();
  };

  const handleSaveParticipants = async (participants: { userId: string; portions: number }[]) => {
    if (!participantsFor) {
      return;
    }
    await storage.setParticipants(participantsFor.id, participants);
    setParticipantsFor(null);
    load();
  };

  const handleAdjust = async (portionScale: number, overrides: { ingredientId: string; quantity: number }[]) => {
    if (!adjusting) {
      return;
    }
    await storage.adjustEntry(adjusting.id, portionScale, overrides);
    setAdjusting(null);
    load();
  };

  const handleAddCustom = async (title: string, ingredients: RecipeIngredient[]) => {
    if (!pickerSlot) {
      return;
    }
    await storage.addCustomEntry(weekStart, { title, ingredients }, pickerSlot.day, pickerSlot.meal);
    setPickerSlot(null);
    load();
  };

  const openPicker = async (day: number, meal: MealType) => {
    setRecipes(await storage.getRecipes());
    setPickerTab('recipe');
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
        >
          <IconChevronLeft className="w-5 h-5" />
        </button>
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
        >
          <IconChevronRight className="w-5 h-5" />
        </button>
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
                        <div className={`rounded-lg p-1.5 text-xs group relative min-h-12 border ${
                          entry.cooked
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30'
                        }`}>
                          <button
                            type="button"
                            onClick={() => entry.recipe && setPreview(entry.recipe)}
                            disabled={!entry.recipe}
                            title={entry.recipe ? 'Podejrzyj przepis' : undefined}
                            className={`block w-full text-left font-medium truncate pr-4 hover:underline ${
                              entry.cooked
                                ? 'text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-500/60'
                                : 'text-primary-900 dark:text-primary-200'
                            }`}>
                            {entry.recipe?.title ?? entry.custom?.title ?? '—'}
                          </button>
                          <button
                            onClick={() => handleCook(entry)}
                            className={`mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors ${
                              entry.cooked
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }`}
                            aria-label={entry.cooked ? 'Cofnij ugotowanie' : 'Oznacz jako ugotowane'}
                            title={entry.cooked ? 'Odjęto składniki ze spiżarni' : 'Ugotowane — odejmie składniki ze spiżarni'}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              entry.cooked
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {entry.cooked && <IconCheck className="w-2.5 h-2.5" />}
                            </span>
                            <span>Zrobione</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <ParticipantsBadges
                              participants={entry.participants ?? []}
                              members={members}
                              onClick={() => setParticipantsFor(entry)}
                            />
                            {baseIngredients(entry).length > 0 && (
                              <button
                                onClick={() => setAdjusting(entry)}
                                title="Dopasuj porcje i składniki"
                                aria-label="Dopasuj porcje i składniki"
                                className="rounded px-1 py-0.5 text-[10px] font-medium text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                              >
                                {adjustmentLabel(entry) ?? '⇄'}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="absolute top-0.5 right-0.5 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-60 group-hover:opacity-100 transition-opacity"
                            aria-label="Usuń"
                          >
                            <IconClose className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openPicker(dayIdx, type)}
                          className="w-full h-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-gray-300 dark:text-gray-600 hover:text-primary-500 flex items-center justify-center transition-colors"
                          aria-label="Dodaj posiłek"
                        >
                          <IconPlus className="w-4 h-4" />
                        </button>
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
                    // Nazwa dania i pora dostają własny wiersz — wciśnięte obok
                    // czterech kontrolek zostawały z „Nal…" na wąskim ekranie.
                    <div key={type} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16 shrink-0">{label}</span>
                        {entry ? (
                          <>
                            <button
                              onClick={() => handleCook(entry)}
                              className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${
                                entry.cooked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600 text-transparent'
                              }`}
                              aria-label={entry.cooked ? 'Cofnij ugotowanie' : 'Oznacz jako ugotowane'}
                            >
                              <IconCheck className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => entry.recipe && setPreview(entry.recipe)}
                              disabled={!entry.recipe}
                              className={`text-sm font-medium flex-1 min-w-0 text-left break-words ${
                                entry.cooked ? 'line-through text-gray-400 dark:text-gray-500' : ''
                              }`}
                            >
                              {entry.recipe?.title ?? entry.custom?.title ?? '—'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openPicker(dayIdx, type)}
                            className="flex-1 inline-flex items-center gap-1 text-sm text-gray-300 dark:text-gray-600 hover:text-primary-600 dark:hover:text-primary-400 py-1"
                          >
                            <IconPlus className="w-3.5 h-3.5" /> Dodaj
                          </button>
                        )}
                      </div>
                      {entry && (
                        <div className="flex items-center gap-2 mt-1.5 pl-[4.5rem]">
                          <ParticipantsBadges
                            participants={entry.participants ?? []}
                            members={members}
                            onClick={() => setParticipantsFor(entry)}
                          />
                          {baseIngredients(entry).length > 0 && (
                            <button
                              onClick={() => setAdjusting(entry)}
                              title="Dopasuj porcje i składniki"
                              aria-label="Dopasuj porcje i składniki"
                              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              {adjustmentLabel(entry) ?? '⇄'}
                            </button>
                          )}
                          <span className="flex-1" />
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="text-gray-300 hover:text-red-500 shrink-0 p-1"
                            aria-label="Usuń"
                          >
                            <IconClose className="w-4 h-4" />
                          </button>
                        </div>
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
              <h2 className="font-semibold">
                {WEEK_DAYS[pickerSlot.day]} · {MEAL_TYPES.find((m) => m.type === pickerSlot.meal)?.label ?? 'Wybierz przepis'}
              </h2>
              <button
                onClick={() => setPickerSlot(null)}
                className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Zamknij"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <div className="flex px-2 border-b border-gray-100 dark:border-gray-800">
              {([['recipe', 'Z przepisu'], ['quick', 'Szybki posiłek']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPickerTab(id)}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    pickerTab === id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {pickerTab === 'quick' ? (
              <div className="overflow-y-auto flex-1">
                <QuickMealForm storage={storage} onSave={handleAddCustom} />
              </div>
            ) : recipes.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">
                Brak przepisów. Dodaj przepis w zakładce „Przepisy” albo wpisz szybki posiłek.
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

      {preview && <RecipePreviewModal recipe={preview} onClose={() => setPreview(null)} />}

      {adjusting && (
        <AdjustEntryModal
          entry={adjusting}
          title={entryTitle(adjusting)}
          ingredients={baseIngredients(adjusting)}
          baseKcalPerServing={baseKcalPerServing(adjusting)}
          onSave={handleAdjust}
          onClose={() => setAdjusting(null)}
        />
      )}

      {participantsFor && (
        <ParticipantsPicker
          members={members}
          initial={participantsFor.participants ?? []}
          servings={participantsFor.recipe?.servings ?? 1}
          perServingKcal={baseKcalPerServing(participantsFor)}
          onSave={handleSaveParticipants}
          onClose={() => setParticipantsFor(null)}
        />
      )}
    </div>
  );
}
