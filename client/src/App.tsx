import { useState, useCallback } from 'react';
import { format, isToday, isTomorrow, isYesterday, startOfMonth, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useSwipe } from './hooks/useSwipe';
import { Calendar } from './components/Calendar';
import { TodoItem } from './components/TodoItem';
import { ShoppingListItem } from './components/ShoppingListItem';
import { AddTodo } from './components/AddTodo';
import { AllTodosView } from './components/AllTodosView';
import { MigrationBanner } from './components/MigrationBanner';
import { ListSelector } from './components/ListSelector';
import { ListSettings } from './components/ListSettings';
import { InvitationBanner } from './components/InvitationBanner';
import { UnassignedView } from './components/UnassignedView';
import { SideMenu } from './components/SideMenu';
import { ThemeToggle } from './components/ThemeToggle';
import { useTodos } from './hooks/useTodos';
import { useDark } from './hooks/useDark';
import { useTodoCounts } from './hooks/useTodoCounts';
import { useAuth } from './hooks/useAuth';
import { useStorage } from './hooks/useStorage';
import { useLists } from './hooks/useLists';
import { useInvitations } from './hooks/useInvitations';
import { useWebSocket } from './hooks/useWebSocket';
import { useOfflineSync } from './hooks/useOfflineSync';

type View = 'calendar' | 'all' | 'unassigned';

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Dzisiaj';
  if (isTomorrow(date)) return 'Jutro';
  if (isYesterday(date)) return 'Wczoraj';
  return format(date, 'EEEE, d MMMM', { locale: pl });
}

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const { storage, mode } = useStorage(user);
  const isCloud = mode === 'cloud';
  const {
    lists, activeList, activeListId, setActiveListId,
    createList, updateList, deleteList, refresh: refreshLists,
  } = useLists(isCloud);
  const { invitations, accept: acceptInvite, decline: declineInvite } = useInvitations(isCloud);
  const [view, setView] = useState<View>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsListId, setSettingsListId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { todos, loading, add, addShopping, addRecurring, toggle, update, updateFull, remove, removeRecurrenceGroup, refresh } = useTodos(dateStr, storage, activeListId ?? undefined);
  const { dark, toggle: toggleDark } = useDark();
  const counts = useTodoCounts(currentMonth, refreshKey, storage, activeListId ?? undefined);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleWsTodoChange = useCallback(() => {
    refresh();
    triggerRefresh();
  }, [refresh, triggerRefresh]);

  const { status: wsStatus } = useWebSocket({
    enabled: isCloud,
    listId: activeListId ?? undefined,
    onTodoChange: handleWsTodoChange,
  });

  const { syncStatus, pendingCount } = useOfflineSync({
    enabled: isCloud,
    onSynced: handleWsTodoChange,
  });

  const handleAdd = async (text: string, time?: string) => {
    await add(text, time);
    triggerRefresh();
  };

  const handleAddShopping = async (text: string) => {
    await addShopping(text);
    triggerRefresh();
  };

  const handleAddRecurring: typeof addRecurring = async (text, time, config) => {
    await addRecurring(text, time, config);
    triggerRefresh();
  };

  const handleDeleteGroup = async (groupId: string) => {
    await removeRecurrenceGroup(groupId);
    triggerRefresh();
  };

  const handleToggle = async (id: string) => {
    await toggle(id);
    triggerRefresh();
  };

  const handleUpdate = async (id: string, text: string, time?: string) => {
    await update(id, text, time);
    triggerRefresh();
  };

  const handleUpdateFull = async (updated: import('./lib/types').Todo) => {
    await updateFull(updated);
    triggerRefresh();
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    triggerRefresh();
  };

  const handleUnassign = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo || !todo.date) return;
    const monthFromDate = todo.date.slice(0, 7);
    await storage.updateTodo({ ...todo, date: undefined, month: monthFromDate });
    await refresh();
    triggerRefresh();
  };

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentMonth((prev) => {
      const newMonth = format(date, 'yyyy-MM');
      return format(prev, 'yyyy-MM') !== newMonth ? startOfMonth(date) : prev;
    });
  }, []);

  const swipeHandlers = useSwipe(
    useCallback(() => handleSelectDate(addDays(selectedDate, 1)), [selectedDate, handleSelectDate]),
    useCallback(() => handleSelectDate(subDays(selectedDate, 1)), [selectedDate, handleSelectDate]),
  );

  const handleAcceptInvite = async (id: string) => {
    await acceptInvite(id);
    await refreshLists();
    triggerRefresh();
  };

  const handleDeclineInvite = async (id: string) => {
    await declineInvite(id);
  };

  const handleDeleteList = async (listId: string) => {
    await deleteList(listId);
    triggerRefresh();
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  const settingsList = settingsListId ? lists.find((l) => l.id === settingsListId) : null;

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all shrink-0"
              aria-label="Menu"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <svg className="w-6 h-6 text-primary-500 shrink-0" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="20" fill="currentColor" />
              <path d="M25 52l15 15 35-35" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isCloud ? (
              <ListSelector
                lists={lists}
                activeList={activeList}
                onSelect={setActiveListId}
                onCreateList={createList}
                onOpenSettings={setSettingsListId}
              />
            ) : (
              <h1 className="text-sm font-semibold truncate">Lista Zadań</h1>
            )}
          </div>
          <ThemeToggle dark={dark} onToggle={toggleDark} />
        </div>
      </header>

      {/* Side menu */}
      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        authLoading={authLoading}
        onLogin={login}
        onLogout={logout}
        dark={dark}
        onToggleDark={toggleDark}
        wsStatus={wsStatus}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        isCloud={isCloud}
        lists={lists}
        activeList={activeList}
        onSelectList={setActiveListId}
        onCreateList={createList}
        onOpenSettings={setSettingsListId}
      />

      {/* Migration banner */}
      {user && <MigrationBanner storage={storage} listId={activeListId ?? undefined} onMigrated={triggerRefresh} />}

      {/* Invitation banner */}
      {user && (
        <InvitationBanner
          invitations={invitations}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}

      {/* Tab bar */}
      <div className="sticky top-[53px] z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50 overflow-x-hidden">
        <div className="max-w-lg mx-auto flex px-2">
          <button
            onClick={() => setView('calendar')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
              view === 'calendar'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalendarz
          </button>
          <button
            onClick={() => setView('all')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
              view === 'all'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Zadania
          </button>
          <button
            onClick={() => setView('unassigned')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
              view === 'unassigned'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Luźne
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4" {...swipeHandlers}>
          {/* Calendar card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <Calendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              counts={counts}
            />
          </div>

          {/* Day header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-bold capitalize">{formatDateLabel(selectedDate)}</h2>
              {!isToday(selectedDate) && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
                </p>
              )}
            </div>
            {totalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}
          </div>

          {/* Todo list */}
          <div className="space-y-2 pb-8">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {todos.map((todo) =>
                  todo.kind === 'shopping' ? (
                    <ShoppingListItem
                      key={todo.id}
                      todo={todo}
                      onUpdate={handleUpdateFull}
                      onDelete={handleDelete}
                    />
                  ) : (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={handleToggle}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onDeleteGroup={todo.recurrenceGroupId ? handleDeleteGroup : undefined}
                      onUnassign={isCloud ? handleUnassign : undefined}
                    />
                  ),
                )}
                <AddTodo selectedDate={dateStr} onAdd={handleAdd} onAddRecurring={handleAddRecurring} onAddShopping={handleAddShopping} />
                {totalCount === 0 && (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                    Brak zadań na ten dzień
                  </p>
                )}
              </>
            )}
          </div>
        </main>
      )}

      {/* All todos view */}
      {view === 'all' && (
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
          <AllTodosView refreshKey={refreshKey} onRefresh={triggerRefresh} storage={storage} listId={activeListId ?? undefined} allowUnassign={isCloud} />
        </main>
      )}

      {/* Unassigned view */}
      {view === 'unassigned' && (
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
          <UnassignedView storage={storage} listId={activeListId ?? undefined} refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </main>
      )}

      {/* List settings modal */}
      {settingsList && (
        <ListSettings
          list={settingsList}
          onClose={() => setSettingsListId(null)}
          onUpdate={(listId, name) => { updateList(listId, name); }}
          onDelete={handleDeleteList}
        />
      )}
    </div>
  );
}
