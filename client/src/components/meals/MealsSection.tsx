import { useState } from 'react';
import type { MealStorage } from '../../lib/meals';
import { RecipesView } from './RecipesView';
import { PlannerView } from './PlannerView';
import { ShoppingView } from './ShoppingView';
import { IconCalendar, IconBook, IconCart } from './icons';

type MealsTab = 'planner' | 'recipes' | 'shopping';

const TABS: { id: MealsTab; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: 'planner', label: 'Planer', Icon: IconCalendar },
  { id: 'recipes', label: 'Przepisy', Icon: IconBook },
  { id: 'shopping', label: 'Zakupy', Icon: IconCart },
];

export function MealsSection({ storage }: { storage: MealStorage }) {
  const [tab, setTab] = useState<MealsTab>('planner');

  return (
    <>
      {/* Sub-tab bar */}
      <div className="sticky top-[53px] z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex px-2">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1">
        {tab === 'planner' && <PlannerView storage={storage} />}
        {tab === 'recipes' && <RecipesView storage={storage} />}
        {tab === 'shopping' && <ShoppingView storage={storage} />}
      </main>
    </>
  );
}
