import { useState } from 'react';
import { RecipesView } from './RecipesView';
import { PlannerView } from './PlannerView';
import { ShoppingView } from './ShoppingView';

type MealsTab = 'planner' | 'recipes' | 'shopping';

const TABS: { id: MealsTab; label: string; icon: string }[] = [
  { id: 'planner', label: 'Planer', icon: '📅' },
  { id: 'recipes', label: 'Przepisy', icon: '🍽️' },
  { id: 'shopping', label: 'Zakupy', icon: '🛒' },
];

export function MealsSection() {
  const [tab, setTab] = useState<MealsTab>('planner');

  return (
    <>
      {/* Sub-tab bar */}
      <div className="sticky top-[53px] z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
                tab === t.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1">
        {tab === 'planner' && <PlannerView />}
        {tab === 'recipes' && <RecipesView />}
        {tab === 'shopping' && <ShoppingView />}
      </main>
    </>
  );
}
