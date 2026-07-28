import { useState, useEffect, useCallback } from 'react';
import {
  getMonday,
  shiftWeek,
  weekLabel,
  WEEK_DAYS,
  MEAL_TYPES,
  type MealStorage,
  type MemberBalance,
  type NutritionBalance,
  type Nutrition,
} from '../../lib/meals';
import { IconChevronLeft, IconChevronRight, IconClose } from './icons';
import { ProteinSplit } from './ProteinSplit';

const MACROS = [
  { key: 'protein', label: 'Białko', color: 'var(--macro-protein)' },
  { key: 'fat', label: 'Tłuszcz', color: 'var(--macro-fat)' },
  { key: 'carbs', label: 'Węglowodany', color: 'var(--macro-carbs)' },
] as const;

function formatGrams(value: number): string {
  return value.toString().replace('.', ',');
}

export function BalanceView({
  storage,
  liveKey = 0,
}: {
  storage: MealStorage;
  liveKey?: number;
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [day, setDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1;
  });
  const [onlyCooked, setOnlyCooked] = useState(false);
  const [balance, setBalance] = useState<NutritionBalance | null>(null);
  const [editingGoal, setEditingGoal] = useState<MemberBalance | null>(null);

  const load = useCallback(async () => {
    setBalance(await storage.getNutritionBalance(weekStart, onlyCooked));
  }, [storage, weekStart, onlyCooked]);

  useEffect(() => { load(); }, [load, liveKey]);

  const anyData = balance?.members.some((m) => m.days.some((d) => d.meals.length > 0)) ?? false;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 active:scale-95 transition-all"
          aria-label="Poprzedni tydzień"
        >
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">Bilans</h1>
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

      {/* Dzień tygodnia */}
      <div className="flex gap-1 mb-3">
        {WEEK_DAYS.map((label, index) => (
          <button
            key={label}
            onClick={() => setDay(index)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              day === index
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={onlyCooked}
          onChange={(e) => setOnlyCooked(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        Licz tylko posiłki odhaczone jako ugotowane
      </label>

      {!balance ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : !anyData ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>Brak danych na ten tydzień.</p>
          <p className="text-sm mt-1">
            Bilans liczy tylko posiłki z przypisanymi domownikami — przypisz ich w planerze.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {balance.members.map((member) => (
            <MemberCard
              key={member.userId}
              member={member}
              day={day}
              onEditGoal={() => setEditingGoal(member)}
            />
          ))}
        </div>
      )}

      {editingGoal && (
        <GoalModal
          member={editingGoal}
          onSave={async (goal) => {
            await storage.setNutritionGoal(goal);
            setEditingGoal(null);
            load();
          }}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  );
}

function MemberCard({
  member,
  day,
  onEditGoal,
}: {
  member: MemberBalance;
  day: number;
  onEditGoal: () => void;
}) {
  const dayBalance = member.days[day];
  const { nutrition, meals, incompleteMeals } = dayBalance;
  const goal = member.goal;
  const ratio = goal && goal.kcal > 0 ? nutrition.kcal / goal.kcal : null;
  // Kolor wypełnienia niesie stan (w celu / powyżej), ale liczba obok mówi to
  // samo — kolor nigdy nie jest jedynym nośnikiem.
  const overGoal = ratio !== null && ratio > 1;

  return (
    <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold truncate">{member.displayName}</h2>
        <button
          onClick={onEditGoal}
          className="text-xs text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 shrink-0"
        >
          {goal ? 'Zmień cel' : 'Ustaw cel'}
        </button>
      </div>

      <p className="text-3xl font-bold leading-none mt-1.5">
        {nutrition.kcal}
        <span className="text-base font-medium text-gray-400 dark:text-gray-500 ml-1.5">kcal</span>
        {goal && (
          <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
            z {goal.kcal} ({Math.round((ratio ?? 0) * 100)}%)
          </span>
        )}
      </p>

      {goal ? (
        <div className="mt-3 h-2.5 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded ${overGoal ? 'bg-amber-500' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Bez ustawionego celu — pokazujemy samą sumę.</p>
      )}

      <MacroRow nutrition={nutrition} goal={goal} />
      <ProteinSplit nutrition={nutrition} />

      {meals.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
          {meals.map((meal) => (
            <li key={meal.entryId} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="text-gray-400 dark:text-gray-500 text-xs mr-1.5">
                  {MEAL_TYPES.find((m) => m.type === meal.mealType)?.label}
                </span>
                {meal.title}
                {meal.portions !== 1 && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                    ({formatGrams(meal.portions)}×)
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                {meal.nutrition.kcal} kcal
              </span>
            </li>
          ))}
        </ul>
      )}

      {incompleteMeals > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-2">
          <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>
            {incompleteMeals === 1 ? 'Jeden posiłek policzony' : `${incompleteMeals} posiłki policzone`} tylko
            częściowo — brakuje makro części składników.
          </span>
        </p>
      )}
    </section>
  );
}

function MacroRow({ nutrition, goal }: { nutrition: Nutrition; goal: MemberBalance['goal'] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
      {MACROS.map((macro) => (
        <li key={macro.key} className="flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: macro.color }} />
          <span className="text-gray-500 dark:text-gray-400">{macro.label}</span>
          <span className="font-medium tabular-nums">
            {formatGrams(nutrition[macro.key])} g
          </span>
          {goal && (
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              / {formatGrams(goal[macro.key])}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function GoalModal({
  member,
  onSave,
  onClose,
}: {
  member: MemberBalance;
  onSave: (goal: { userId: string; kcal: number; protein: number; fat: number; carbs: number }) => void;
  onClose: () => void;
}) {
  const [kcal, setKcal] = useState(String(member.goal?.kcal ?? 2000));
  const [protein, setProtein] = useState(String(member.goal?.protein ?? 100));
  const [fat, setFat] = useState(String(member.goal?.fat ?? 70));
  const [carbs, setCarbs] = useState(String(member.goal?.carbs ?? 250));

  const fields = [
    { label: 'Energia (kcal)', value: kcal, set: setKcal },
    { label: 'Białko (g)', value: protein, set: setProtein },
    { label: 'Tłuszcz (g)', value: fat, set: setFat },
    { label: 'Węglowodany (g)', value: carbs, set: setCarbs },
  ];

  const save = () => {
    onSave({
      userId: member.userId,
      kcal: parseFloat(kcal) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      carbs: parseFloat(carbs) || 0,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="font-semibold truncate">Cel dzienny: {member.displayName}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Dotyczy tego gospodarstwa.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
            aria-label="Zamknij"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          {fields.map((field) => (
            <label key={field.label} className="block">
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mb-1">{field.label}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
          ))}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={save}
            className="w-full bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Zapisz cel
          </button>
        </div>
      </div>
    </div>
  );
}
