import { useState, useRef, useEffect } from 'react';
import type { AuthUser } from '../hooks/useAuth';
import type { WsStatus } from '../hooks/useWebSocket';
import type { SyncStatus } from '../lib/offlineQueue';
import type { TodoList } from '../lib/types';

interface SideMenuProps {
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
  lists: TodoList[];
  activeList: TodoList | null;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string) => void;
  onOpenSettings: (listId: string) => void;
}

export function SideMenu({
  open,
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
  lists,
  activeList,
  onSelectList,
  onCreateList,
  onOpenSettings,
}: SideMenuProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewName('');
    }
  }, [open]);

  useEffect(() => {
    if (creating) {
      inputRef.current?.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleCreate = () => {
    const name = newName.trim();
    if (name) {
      onCreateList(name);
      setNewName('');
      setCreating(false);
    }
  };

  const statusLabel = (): { text: string; color: string; pulse?: boolean } => {
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
  };

  if (!open) {
    return null;
  }

  const status = statusLabel();

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-950 shadow-2xl flex flex-col animate-slide-in-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile section */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            {user ? (
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ) : !authLoading ? (
              <button
                onClick={() => { onLogin(); onClose(); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
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

          {/* Connection status */}
          {isCloud && (
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} ${status.pulse ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  chmura
                </span>
              </div>
            </div>
          )}

          {!isCloud && (
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  lokalnie
                </span>
              </div>
            </div>
          )}

          {/* Lists */}
          {isCloud && (
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Listy</p>
              <div className="space-y-0.5">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
                      list.id === activeList?.id
                        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <button
                      className="flex-1 text-left text-sm truncate"
                      onClick={() => { onSelectList(list.id); onClose(); }}
                    >
                      {list.name}
                      {list.role !== 'owner' && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          {list.role === 'editor' ? 'edytor' : 'podgląd'}
                        </span>
                      )}
                    </button>
                    {list.role === 'owner' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenSettings(list.id); onClose(); }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-2">
                {creating ? (
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { handleCreate(); } }}
                      placeholder="Nazwa listy..."
                      className="min-w-0 flex-1 text-sm px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleCreate}
                      className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full text-left px-2.5 py-2 text-sm text-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors"
                  >
                    + Nowa lista
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Theme toggle */}
          <div className="px-5 py-3">
            <button
              onClick={onToggleDark}
              className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
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
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {dark ? 'Tryb jasny' : 'Tryb ciemny'}
              </span>
            </button>
          </div>
        </div>

        {/* Logout at bottom */}
        {user && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3">
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Wyloguj</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
