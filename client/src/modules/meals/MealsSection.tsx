import { useEffect, useState } from 'react';
import type { MealStorage } from './meals';
import { useMealsRealtime } from './useMealsRealtime';
import { RecipesView } from './RecipesView';
import { PlannerView } from './PlannerView';
import { ShoppingView } from './ShoppingView';
import { ProductsView } from './ProductsView';
import { PantryView } from './PantryView';
import { BalanceView } from './BalanceView';
import { SectionTabs, type SectionTab } from '@platform/shell/SectionTabs';
import { IconCalendar, IconBook, IconCart, IconTag, IconBox, IconBalance } from './icons';

type MealsTab = 'planner' | 'recipes' | 'products' | 'pantry' | 'shopping' | 'balance';

const TABS: SectionTab<MealsTab>[] = [
  { id: 'planner', label: 'Planer', Icon: IconCalendar },
  { id: 'recipes', label: 'Przepisy', Icon: IconBook },
  { id: 'products', label: 'Produkty', Icon: IconTag },
  { id: 'pantry', label: 'Spiżarnia', Icon: IconBox },
  { id: 'shopping', label: 'Zakupy', Icon: IconCart },
  { id: 'balance', label: 'Bilans', Icon: IconBalance },
];

interface MealsSectionProps {
  storage: MealStorage;
  householdId: string;
}

const TAB_KEY = 'lista-zadan:meals-tab';

export function MealsSection({ storage, householdId }: MealsSectionProps) {
  // Remember the last meals sub-tab so a reload doesn't always reset to Planer.
  const [tab, setTab] = useState<MealsTab>(() => {
    const saved = localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === saved) ? (saved as MealsTab) : 'planner';
  });
  const [liveKey, setLiveKey] = useState(0);

  useEffect(() => {
    localStorage.setItem(TAB_KEY, tab);
  }, [tab]);

  // Live updates from other household members.
  useMealsRealtime(householdId, true, () => setLiveKey((k) => k + 1));

  return (
    <>
      <SectionTabs tabs={TABS} active={tab} onSelect={setTab} />

      <main className="flex-1">
        {tab === 'planner' && <PlannerView storage={storage} householdId={householdId} liveKey={liveKey} />}
        {tab === 'balance' && <BalanceView storage={storage} liveKey={liveKey} />}
        {tab === 'recipes' && <RecipesView storage={storage} liveKey={liveKey} />}
        {tab === 'products' && <ProductsView storage={storage} liveKey={liveKey} />}
        {tab === 'pantry' && <PantryView storage={storage} liveKey={liveKey} />}
        {tab === 'shopping' && <ShoppingView storage={storage} liveKey={liveKey} />}
      </main>
    </>
  );
}
