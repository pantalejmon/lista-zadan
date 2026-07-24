import { useEffect } from 'react';
import { PushToggle } from './PushToggle';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import type { AuthUser } from '../hooks/useAuth';
import type { Household } from '../lib/types';
import type { WsStatus } from '../hooks/useWebSocket';
import type { SyncStatus } from '../lib/offlineQueue';

export type AppSection = 'tasks' | 'meals' | 'home' | 'finance' | 'chat';

interface NavItem {
  id: AppSection;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'tasks',
    label: 'Zadania',
    description: 'Kalendarz i listy',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: 'meals',
    label: 'Posiłki',
    description: 'Planer, przepisy, zakupy',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M7 3v6a2 2 0 01-2 2H3m4-8v18M14 5c0-1.1.9-2 2-2s2 .9 2 2v6h-4V5zm0 6v10" />
      </svg>
    ),
  },
  {
    id: 'home',
    label: 'Serwis domu',
    description: 'Przeglądy, gwarancje, koszty',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'finance',
    label: 'Finanse',
    description: 'Portfele, wydatki, statystyki',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 10a2 2 0 012-2h14a2 2 0 012 2m-18 0v8a2 2 0 002 2h14a2 2 0 002-2v-8m-5 4h2" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Czat',
    description: 'Rozmowy domowników',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4-.8L3 20l.8-3.2A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

interface AppSidebarProps {
  section: AppSection;
  onSection: (section: AppSection) => void;
  open: boolean;
  onClose: () => void;
  user: AuthUser | null;
  authLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
  dark: boolean;
  onToggleDark: () => void;
  wsStatus: WsStatus;
  syncStatus: SyncStatus;
  pendingCount: number;
  isCloud: boolean;
  onOpenTokens?: () => void;
  households: Household[];
  activeHouseholdId: string | null;
  onSelectHousehold: (id: string) => void;
  onOpenHouseholdSettings: (id: string) => void;
  onCreateHousehold: (name: string) => void;
}

export function AppSidebar(props: AppSidebarProps) {
  const { open, onClose } = props;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Desktop: persistent rail */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-950/60 h-dvh sticky top-0">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile: slide-out drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-950 shadow-2xl flex flex-col animate-slide-in-left">
            <SidebarContent {...props} />
          </div>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  section,
  onSection,
  onClose,
  user,
  authLoading,
  onLogin,
  onLogout,
  dark,
  onToggleDark,
  wsStatus,
  syncStatus,
  pendingCount,
  isCloud,
  onOpenTokens,
  households,
  activeHouseholdId,
  onSelectHousehold,
  onOpenHouseholdSettings,
  onCreateHousehold,
}: AppSidebarProps) {
  const status = statusLabel(wsStatus, syncStatus, pendingCount);

  const selectSection = (id: AppSection) => {
    onSection(id);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <svg className="w-7 h-7 text-primary-500 shrink-0" viewBox="0 0 100 100" fill="none">
          <rect width="100" height="100" rx="24" fill="currentColor" />
          <path d="M25 52l15 15 35-35" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Dom</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">Twój domowy asystent</p>
        </div>
      </div>

      {/* Global household context — used by Posiłki/Serwis domu, + settings/create */}
      {isCloud && households.length > 0 && (
        <HouseholdSwitcher
          households={households}
          activeHouseholdId={activeHouseholdId}
          onSelect={onSelectHousehold}
          onOpenSettings={onOpenHouseholdSettings}
          onCreate={onCreateHousehold}
          onNavigate={onClose}
        />
      )}

      {/* Feature navigation — Posiłki/Czat wymagają konta (gospodarstwa); lokalnie tylko Zadania */}
      <nav className="px-3 py-4 space-y-1">
        <p className="px-2 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Aplikacje</p>
        {NAV_ITEMS.filter((item) => isCloud || item.id === 'tasks').map((item) => (
          <button
            key={item.id}
            onClick={() => selectSection(item.id)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
              section === item.id
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-medium truncate">{item.label}</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">{item.description}</span>
            </span>
          </button>
        ))}
        {!isCloud && (
          <button
            onClick={() => { onLogin(); onClose(); }}
            className="flex items-start gap-3 w-full px-3 py-2.5 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-medium truncate">Posiłki i Czat</span>
              <span className="block text-[11px] leading-tight">Zaloguj się, aby odblokować</span>
            </span>
          </button>
        )}
      </nav>

      <div className="flex-1" />

      {/* Connection status */}
      {isCloud && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} ${status.pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
          </div>
        </div>
      )}

      {/* Notifications + theme toggle */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
        {isCloud && <PushToggle />}
        {isCloud && onOpenTokens && (
          <button
            onClick={() => { onOpenTokens(); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Dostęp API / MCP</span>
          </button>
        )}
        <button
          onClick={onToggleDark}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        >
          {dark ? (
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">{dark ? 'Tryb jasny' : 'Tryb ciemny'}</span>
        </button>
      </div>

      {/* Account */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
        {user ? (
          <div className="flex items-center gap-3 px-2">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Wyloguj"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : !authLoading ? (
          <button
            onClick={() => { onLogin(); onClose(); }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Zaloguj przez Google
          </button>
        ) : null}
      </div>
    </div>
  );
}

function statusLabel(
  wsStatus: WsStatus,
  syncStatus: SyncStatus,
  pendingCount: number,
): { text: string; color: string; pulse?: boolean } {
  if (syncStatus === 'syncing') {
    return { text: 'Synchronizacja...', color: 'text-blue-500', pulse: true };
  }
  if (syncStatus === 'error') {
    return { text: 'Błąd synchronizacji', color: 'text-red-500' };
  }
  if (pendingCount > 0) {
    return { text: `${pendingCount} oczekuje`, color: 'text-amber-500' };
  }
  if (wsStatus === 'connected') {
    return { text: 'Połączono', color: 'text-emerald-500' };
  }
  if (wsStatus === 'connecting') {
    return { text: 'Łączenie...', color: 'text-gray-400', pulse: true };
  }
  return { text: 'Offline', color: 'text-gray-400' };
}
