import { useState } from 'react';
import { MaintenanceView } from './MaintenanceView';
import { RenovationsView } from './RenovationsView';
import { ProvidersView } from './ProvidersView';

interface HomeSectionProps {
  householdId?: string;
}

type HomeTab = 'maintenance' | 'renovations' | 'providers';

const TABS: { id: HomeTab; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  {
    id: 'maintenance',
    label: 'Przeglądy',
    Icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'renovations',
    label: 'Remonty',
    Icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    id: 'providers',
    label: 'Wykonawcy',
    Icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.83-4" />
      </svg>
    ),
  },
];

export function HomeSection({ householdId }: HomeSectionProps) {
  const [tab, setTab] = useState<HomeTab>('maintenance');

  return (
    <>
      {/* Sub-tab bar */}
      <div className="sticky top-14 z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
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
        {tab === 'maintenance' && <MaintenanceView householdId={householdId} />}
        {tab === 'renovations' && <RenovationsView householdId={householdId} />}
        {tab === 'providers' && <ProvidersView householdId={householdId} />}
      </main>
    </>
  );
}
