import { useState } from 'react';
import type { MealStorage } from '../../lib/meals';
import type { Household } from '../../lib/types';
import { useMealsRealtime } from '../../hooks/useMealsRealtime';
import { RecipesView } from './RecipesView';
import { PlannerView } from './PlannerView';
import { ShoppingView } from './ShoppingView';
import { ProductsView } from './ProductsView';
import { PantryView } from './PantryView';
import { IconCalendar, IconBook, IconCart, IconTag, IconBox } from './icons';

type MealsTab = 'planner' | 'recipes' | 'products' | 'pantry' | 'shopping';

const TABS: { id: MealsTab; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: 'planner', label: 'Planer', Icon: IconCalendar },
  { id: 'recipes', label: 'Przepisy', Icon: IconBook },
  { id: 'products', label: 'Produkty', Icon: IconTag },
  { id: 'pantry', label: 'Spiżarnia', Icon: IconBox },
  { id: 'shopping', label: 'Zakupy', Icon: IconCart },
];

interface MealsSectionProps {
  storage: MealStorage;
  households?: Household[];
  householdId?: string;
  onSelectHousehold?: (id: string) => void;
}

export function MealsSection({ storage, households = [], householdId, onSelectHousehold }: MealsSectionProps) {
  const [tab, setTab] = useState<MealsTab>('planner');
  const [liveKey, setLiveKey] = useState(0);

  // Live updates from other household members.
  useMealsRealtime(householdId, Boolean(householdId), () => setLiveKey((k) => k + 1));

  return (
    <>
      {/* Household selector — only when the user belongs to more than one */}
      {households.length > 1 && (
        <div className="max-w-lg mx-auto w-full px-4 pt-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="shrink-0">Gospodarstwo:</span>
            <select
              value={householdId ?? ''}
              onChange={(e) => onSelectHousehold?.(e.target.value)}
              className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Sub-tab bar */}
      <div className="sticky top-[53px] z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex px-2">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1">
        {tab === 'planner' && <PlannerView storage={storage} liveKey={liveKey} />}
        {tab === 'recipes' && <RecipesView storage={storage} liveKey={liveKey} />}
        {tab === 'products' && <ProductsView storage={storage} liveKey={liveKey} />}
        {tab === 'pantry' && <PantryView storage={storage} liveKey={liveKey} />}
        {tab === 'shopping' && <ShoppingView storage={storage} liveKey={liveKey} />}
      </main>
    </>
  );
}
