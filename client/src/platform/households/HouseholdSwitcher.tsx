import { useState } from 'react';
import type { Household } from './household.types';

interface HouseholdSwitcherProps {
  households: Household[];
  activeHouseholdId: string | null;
  onSelect: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onCreate: (name: string) => void;
  onNavigate?: () => void;
}

// Global household context in the sidebar: switch the active household (used by
// Posiłki and Serwis domu), open its settings, or create a new one. Central so
// household management isn't scattered across panels.
export function HouseholdSwitcher({
  households,
  activeHouseholdId,
  onSelect,
  onOpenSettings,
  onCreate,
  onNavigate,
}: HouseholdSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const active = households.find((h) => h.id === activeHouseholdId) ?? households[0] ?? null;

  const handleCreate = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onCreate(trimmed);
      setName('');
      setCreating(false);
    }
  };

  return (
    <div className="px-3 pt-3">
      <p className="px-2 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gospodarstwo</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
        <svg className="w-4 h-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{active?.name ?? 'Brak'}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-1">
          {households.map((h) => (
            <button
              key={h.id}
              onClick={() => { onSelect(h.id); setOpen(false); }}
              className={`flex items-center justify-between gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
                h.id === active?.id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="truncate">{h.name}</span>
              {h.id === active?.id && (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

          {active && (
            <button
              onClick={() => { onOpenSettings(active.id); setOpen(false); onNavigate?.(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ustawienia gospodarstwa
            </button>
          )}

          {creating ? (
            <div className="px-3 py-2 flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleCreate(); } }}
                placeholder="Nazwa gospodarstwa..."
                className="min-w-0 flex-1 text-sm px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button onClick={handleCreate} className="shrink-0 text-xs font-medium px-2 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600">OK</button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full text-left px-3 py-2 text-sm text-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              + Nowe gospodarstwo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
