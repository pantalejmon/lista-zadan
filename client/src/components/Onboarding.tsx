import { useState } from 'react';
import type { HouseholdInvitation } from '../lib/types';
import type { AuthUser } from '../hooks/useAuth';

interface OnboardingProps {
  user: AuthUser;
  invitations: HouseholdInvitation[];
  onCreate: (name: string) => Promise<void>;
  onAccept: (invitationId: string) => Promise<void>;
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export function Onboarding({ user, invitations, onCreate, onAccept }: OnboardingProps) {
  const [name, setName] = useState(`Dom ${firstName(user.displayName)}`);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) {
      return;
    }
    setBusy(true);
    try {
      await onCreate(trimmed);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await onAccept(id);
    } finally {
      setBusy(false);
    }
  };

  const hasInvites = invitations.length > 0;

  return (
    <div className="min-h-[100svh] flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <svg className="w-12 h-12 text-primary-500 mb-3" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="24" fill="currentColor" />
            <path d="M25 52l15 15 35-35" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-xl font-bold">Witaj, {firstName(user.displayName)}!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Zacznij od swojego domu — to w nim dzielisz zadania, posiłki i czat z domownikami.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-5">
          {/* Pending invitations */}
          {hasInvites && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Masz {invitations.length === 1 ? 'zaproszenie' : 'zaproszenia'}
              </p>
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-2xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{inv.householdName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      od {inv.invitedByName} · rola: {inv.role === 'editor' ? 'edytor' : 'podgląd'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAccept(inv.id)}
                    disabled={busy}
                    className="shrink-0 text-sm font-medium px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    Dołącz
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-3 py-1">
                <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400">albo</span>
                <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          )}

          {/* Create own household */}
          <div>
            <label htmlFor="household-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {hasInvites ? 'Utwórz własny dom' : 'Nazwij swój dom'}
            </label>
            <input
              id="household-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleCreate(); } }}
              placeholder="np. Dom Kowalskich"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleCreate}
              disabled={!name.trim() || busy}
              className="mt-3 w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Tworzenie...' : 'Utwórz i zaczynaj'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Możesz później dodać kolejne gospodarstwa i zaprosić domowników.
        </p>
      </div>
    </div>
  );
}
