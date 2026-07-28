import { STICKY_UNDER_HEADER } from '../lib/layout';

export interface SectionTab<T extends string> {
  id: T;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}

// Pasek podzakładek sekcji (Posiłki, Serwis domu, Finanse).
//
// **Wszystkie zakładki są zawsze widoczne.** Wcześniej pasek przewijał się
// w bok, więc przy sześciu zakładkach ostatnie znikały za krawędzią — nie dało
// się ich zobaczyć, nie wiedząc, że tam są. Zamiast tego chowamy etykiety
// nieaktywnych zakładek na wąskim ekranie: ikony zostają klikalne, a etykieta
// aktywnej mówi, gdzie jesteśmy. Przy czterech i mniej zakładkach etykiety
// mieszczą się zawsze, więc nic nie chowamy.
export function SectionTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: SectionTab<T>[];
  active: T;
  onSelect: (id: T) => void;
}) {
  const collapseInactive = tabs.length > 4;

  return (
    <div
      className={`${STICKY_UNDER_HEADER} z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-center gap-0.5 px-2 py-1.5" role="tablist">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              // Etykieta bywa ukryta, więc nazwa musi zostać dla czytnika
              // ekranu i dla dymka po najechaniu.
              aria-label={label}
              title={label}
              onClick={() => onSelect(id)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-2 min-h-10 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={isActive || !collapseInactive ? '' : 'hidden sm:inline'}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
