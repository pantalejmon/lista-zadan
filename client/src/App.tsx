import { useState, useCallback } from 'react';
import { format, isToday, isTomorrow, isYesterday, startOfMonth, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useSwipe } from './hooks/useSwipe';
import { Calendar } from './components/Calendar';
import { TodoItem } from './components/TodoItem';
import { AddTodo } from './components/AddTodo';
import { AllTodosView } from './components/AllTodosView';
import { ThemeToggle } from './components/ThemeToggle';
import { UserMenu } from './components/UserMenu';
import { ModeIndicator } from './components/ModeIndicator';
import { MigrationBanner } from './components/MigrationBanner';
import { ListSelector } from './components/ListSelector';
import { ListSettings } from './components/ListSettings';
import { InvitationBanner } from './components/InvitationBanner';
import { useTodos } from './hooks/useTodos';
import { useDark } from './hooks/useDark';
import { useTodoCounts } from './hooks/useTodoCounts';
import { useAuth } from './hooks/useAuth';
import { useStorage } from './hooks/useStorage';
import { useLists } from './hooks/useLists';
import { useInvitations } from './hooks/useInvitations';

type View = 'calendar' | 'all';

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

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { todos, loading, add, addRecurring, toggle, update, remove, removeRecurrenceGroup } = useTodos(dateStr, storage, activeListId ?? undefined);
  const { dark, toggle: toggleDark } = useDark();
  const counts = useTodoCounts(currentMonth, refreshKey, storage, activeListId ?? undefined);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAdd = async (text: string, time?: string) => {
    await add(text, time);
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

  const handleDelete = async (id: string) => {
    await remove(id);
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
    <div className="min-h-dvh flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-500" viewBox="0 0 100 100" fill="none">
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
              <h1 className="text-base font-bold">Lista Zadań</h1>
            )}
            <ModeIndicator mode={mode} />
          </div>
          <div className="flex items-center gap-2">
            {!authLoading && !user && (
              <button
                onClick={login}
                className="text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10"
              >
                Zaloguj
              </button>
            )}
            {user && <UserMenu user={user} onLogout={logout} />}
            <ThemeToggle dark={dark} onToggle={toggleDark} />
          </div>
        </div>
      </header>

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
      <div className="sticky top-[53px] z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex px-4">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              view === 'calendar'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalendarz
          </button>
          <button
            onClick={() => setView('all')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              view === 'all'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Lista zadań
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
                {todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onDeleteGroup={todo.recurrenceGroupId ? handleDeleteGroup : undefined}
                  />
                ))}
                <AddTodo selectedDate={dateStr} onAdd={handleAdd} onAddRecurring={handleAddRecurring} />
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
          <AllTodosView refreshKey={refreshKey} onRefresh={triggerRefresh} storage={storage} listId={activeListId ?? undefined} />
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
