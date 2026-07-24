import {
  IconTileTasks,
  IconTileMeals,
  IconTileHomeService,
  IconTileFinance,
  IconTileChat,
} from '../components/AppIcons';

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
