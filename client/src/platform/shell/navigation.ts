import type { Settings } from './settings';
import {
  IconTileTasks,
  IconTileMeals,
  IconTileHomeService,
  IconTileFinance,
  IconTileChat,
} from './AppIcons';

export type AppSection = 'tasks' | 'meals' | 'home' | 'finance' | 'chat';

export interface NavItem {
  id: AppSection;
  label: string;
  description: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}

// Jedno źródło prawdy o sekcjach — korzysta z niego menu i górna belka.
export const NAV_ITEMS: NavItem[] = [
  { id: 'tasks', label: 'Zadania', description: 'Kalendarz i listy', Icon: IconTileTasks },
  { id: 'meals', label: 'Posiłki', description: 'Planer, przepisy, zakupy', Icon: IconTileMeals },
  { id: 'home', label: 'Serwis domu', description: 'Przeglądy, gwarancje, koszty', Icon: IconTileHomeService },
  { id: 'finance', label: 'Finanse', description: 'Portfele, wydatki, statystyki', Icon: IconTileFinance },
  { id: 'chat', label: 'Czat', description: 'Rozmowy domowników', Icon: IconTileChat },
];

// Jedno miejsce, które decyduje o widocznych sekcjach: tryb lokalny (tylko
// Zadania) **i** moduły ukryte w ustawieniach. Menu i górna belka czytają
// stąd, zamiast trzymać dwa równoległe warunki.
export function visibleNavItems(settings: Settings, isCloud: boolean): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      item.id === 'tasks' ||
      (isCloud && !settings.hiddenModules.includes(item.id as 'meals' | 'home' | 'finance' | 'chat')),
  );
}
