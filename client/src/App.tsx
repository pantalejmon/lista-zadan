import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { HouseholdSettings } from './components/HouseholdSettings';
import { TokensSettings } from './components/TokensSettings';
import { SettingsModal } from './components/SettingsModal';
import { InvitationBanner } from './components/InvitationBanner';
import { UnassignedView } from './components/UnassignedView';
import { AppSidebar } from './components/AppSidebar';
import { NAV_ITEMS, type AppSection } from './lib/navigation';
import { STICKY_UNDER_HEADER } from './lib/layout';
import { Onboarding } from './components/Onboarding';
import { setupHousehold, updateUserSettings } from './lib/api';
import { MealsSection } from './components/meals/MealsSection';
import { HomeSection } from './components/home/HomeSection';
import { FinanceSection } from './components/finance/FinanceSection';
import { ChatView } from './components/ChatView';
import { useTodos } from './hooks/useTodos';
import { useSettings } from './hooks/useSettings';
import { useTodoCounts } from './hooks/useTodoCounts';
import { useAuth } from './hooks/useAuth';
import { useStorage } from './hooks/useStorage';
import { useLists } from './hooks/useLists';
import { useHouseholds } from './hooks/useHouseholds';
import { useInvitations } from './hooks/useInvitations';
import { useWebSocket } from './hooks/useWebSocket';
import { useChatNotifications } from './hooks/useChatNotifications';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useMealStorage } from './hooks/useMealStorage';
import { useMealHousehold } from './hooks/useMealHousehold';

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
    createList, updateList, deleteList, moveList, refresh: refreshLists,
  } = useLists(isCloud);
  const {
    households, loading: householdsLoading, createHousehold, renameHousehold, refresh: refreshHouseholds,
  } = useHouseholds(isCloud);
  const { invitations, accept: acceptInvite, decline: declineInvite } = useInvitations(isCloud);
  // Restore where the user was last (section + sub-view) so reopening the app
  // doesn't dump them back on the calendar. A push deep-link still overrides it.
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('lista-zadan:view');
    return saved === 'calendar' || saved === 'all' || saved === 'unassigned' ? saved : 'calendar';
  });
  const [section, setSection] = useState<AppSection>(() => {
    const saved = localStorage.getItem('lista-zadan:section');
    return saved && NAV_ITEMS.some((item) => item.id === saved) ? (saved as AppSection) : 'tasks';
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsListId, setSettingsListId] = useState<string | null>(null);
  const [householdSettingsId, setHouseholdSettingsId] = useState<string | null>(null);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { todos, loading, add, addShopping, addRecurring, toggle, update, updateFull, remove, removeRecurrenceGroup, refresh } = useTodos(dateStr, storage, activeListId ?? undefined);
  const { settings, update: updateSettings, toggleDark, hydrate: hydrateSettings, dark } = useSettings();
  const counts = useTodoCounts(currentMonth, refreshKey, storage, activeListId ?? undefined);
  const { mealHousehold, setMealHouseholdId } = useMealHousehold(households);
  const mealStorage = useMealStorage(mealHousehold?.id);

  // Tasks are scoped to the globally-selected household (left sidebar): only its
  // lists are shown, and switching household re-points the active list.
  const householdLists = useMemo(
    () => (mealHousehold ? lists.filter((l) => l.householdId === mealHousehold.id) : lists),
    [lists, mealHousehold],
  );

  // Remember the last-opened list so a reload doesn't dump the user on the
  // household default. Only restored when it still belongs to the active household.
  const savedListIdRef = useRef<string | null>(localStorage.getItem('lista-zadan:activeListId'));
  useEffect(() => {
    if (activeListId) {
      localStorage.setItem('lista-zadan:activeListId', activeListId);
    }
  }, [activeListId]);

  useEffect(() => {
    if (!isCloud || !mealHousehold) {
      return;
    }
    const inHousehold = lists.filter((l) => l.householdId === mealHousehold.id);
    if (inHousehold.length === 0) {
      if (activeListId !== null) {
        setActiveListId(null);
      }
      return;
    }
    if (!activeList || activeList.householdId !== mealHousehold.id) {
      const saved = savedListIdRef.current
        ? inHousehold.find((l) => l.id === savedListIdRef.current)
        : undefined;
      const target = saved ?? inHousehold.find((l) => l.isDefault) ?? inHousehold[0];
      // Consume the saved hint once so later household switches use the default.
      savedListIdRef.current = null;
      setActiveListId(target.id);
    }
  }, [isCloud, mealHousehold, lists, activeList, activeListId, setActiveListId]);

  // Posiłki i Czat wymagają konta (gospodarstwa). W trybie lokalnym trzymamy usera na Zadaniach.
  // Czekamy aż auth się rozwiąże — inaczej podczas bootowania (user jeszcze null → mode 'local')
  // ten efekt zresetowałby przywróconą sekcję na 'tasks' i nigdy jej nie przywrócił.
  useEffect(() => {
    if (!authLoading && !isCloud && section !== 'tasks') {
      setSection('tasks');
    }
  }, [authLoading, isCloud, section]);

  // Zapamiętaj ostatnie miejsce, żeby po ponownym otwarciu apki nie cofało.
  useEffect(() => {
    localStorage.setItem('lista-zadan:section', section);
  }, [section]);
  useEffect(() => {
    localStorage.setItem('lista-zadan:view', view);
  }, [view]);

  // Appearance settings follow the account. On login: adopt the settings stored
  // on the server (they win over this device); if the account has none yet, seed
  // it from whatever this device is using. Afterwards every local change is
  // pushed back (debounced) so both phones stay in sync.
  const settingsSyncedRef = useRef(false);
  useEffect(() => {
    if (!isCloud || !user || settingsSyncedRef.current) {
      return;
    }
    settingsSyncedRef.current = true;
    if (user.settings) {
      hydrateSettings(user.settings);
    } else {
      updateUserSettings(settings).catch(() => {});
    }
  }, [isCloud, user, hydrateSettings, settings]);

  useEffect(() => {
    if (!isCloud || !settingsSyncedRef.current) {
      return;
    }
    const id = setTimeout(() => {
      updateUserSettings(settings).catch(() => {});
    }, 500);
    return () => clearTimeout(id);
  }, [isCloud, settings]);

  // Reset the one-time sync guard on logout so a different account re-hydrates.
  useEffect(() => {
    if (!user) {
      settingsSyncedRef.current = false;
    }
  }, [user]);

  // Deep-links from push notifications. Two entry points:
  //  • the service worker focuses an open window and postMessages the target;
  //  • a cold-opened PWA lands on a "#section" hash (captured once on mount).
  // Sekcje wymagające gospodarstwa (czat itd.) stosujemy dopiero, gdy dane są
  // gotowe — inaczej efekt „trzymaj lokalnego usera na Zadaniach" by je zresetował.
  const pendingNavRef = useRef<{ section?: string; householdId?: string } | null>(null);
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      pendingNavRef.current = { section: hash };
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);
  useEffect(() => {
    const applyTarget = (target: { section?: string; householdId?: string }) => {
      if (target.householdId) {
        setMealHouseholdId(target.householdId);
      }
      if (target.section && NAV_ITEMS.some((item) => item.id === target.section)) {
        setSection(target.section as AppSection);
      }
    };

    // Apply a cold-start target only once the app is ready: auth resolved (so
    // isCloud is final) and, for cloud users, households loaded. Otherwise the
    // "keep local users on Tasks" effect could reset the section mid-boot.
    if (pendingNavRef.current && !authLoading && (!isCloud || households.length > 0)) {
      applyTarget(pendingNavRef.current);
      pendingNavRef.current = null;
    }

    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'notification-navigate') {
        return;
      }
      const fromHash = typeof msg.url === 'string' ? msg.url.split('#')[1] : undefined;
      const section = (msg.data && typeof msg.data.type === 'string' ? msg.data.type : undefined) ?? fromHash;
      applyTarget({ section, householdId: msg.data?.householdId });
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [authLoading, isCloud, households, setMealHouseholdId]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleWsTodoChange = useCallback(() => {
    refresh();
    triggerRefresh();
  }, [refresh, triggerRefresh]);

  // In-app notifications: flag new tasks (from other members/devices) when the
  // change arrives over the socket while the user isn't on the Zadania section.
  const [tasksBadge, setTasksBadge] = useState(false);
  const sectionRef = useRef(section);
  useEffect(() => { sectionRef.current = section; }, [section]);
  useEffect(() => {
    if (section === 'tasks') {
      setTasksBadge(false);
    }
  }, [section]);

  const handleRemoteTodoChange = useCallback(() => {
    refresh();
    triggerRefresh();
    if (sectionRef.current !== 'tasks') {
      setTasksBadge(true);
    }
  }, [refresh, triggerRefresh]);

  const { status: wsStatus } = useWebSocket({
    enabled: isCloud,
    listId: activeListId ?? undefined,
    onTodoChange: handleRemoteTodoChange,
  });

  const { syncStatus, pendingCount } = useOfflineSync({
    enabled: isCloud,
    onSynced: handleWsTodoChange,
  });

  // Unread chat messages → badge on the Czat nav item (cleared when chat is open).
  const { unread: chatUnread } = useChatNotifications(
    mealHousehold?.id,
    isCloud,
    section === 'chat',
    user?.id,
  );

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
    await refreshHouseholds();
    await refreshLists();
    triggerRefresh();
  };

  const handleCreateHousehold = async (name: string) => {
    await createHousehold(name);
  };

  const handleRenameHousehold = async (householdId: string, name: string) => {
    await renameHousehold(householdId, name);
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
  const settingsHousehold = householdSettingsId
    ? households.find((h) => h.id === householdSettingsId)
    : null;

  const sectionTitle =
    section === 'meals' ? 'Posiłki'
      : section === 'home' ? 'Serwis domu'
        : section === 'finance' ? 'Finanse'
          : section === 'chat' ? 'Czat' : 'Zadania';

  // Ikona bieżącej sekcji w belce — ta sama, co w menu
  const SectionIcon = NAV_ITEMS.find((item) => item.id === section)?.Icon ?? NAV_ITEMS[0].Icon;

  // First-login onboarding: logged in but no household yet → name your home or accept an invitation.
  if (isCloud && user && !householdsLoading && households.length === 0) {
    return (
      <Onboarding
        user={user}
        invitations={invitations}
        onCreate={async (name) => {
          await setupHousehold(name);
          await refreshHouseholds();
          await refreshLists();
          triggerRefresh();
        }}
        onAccept={handleAcceptInvite}
      />
    );
  }

  // Od tabletu (md) pasek boczny i treść stoją obok siebie — breakpoint musi się
  // zgadzać z widocznością paska w AppSidebar, inaczej treść ląduje pod paskiem.
  // `overflow-x-clip`, nie `-hidden`: hidden robi z tego kontenera scroll container
  // i psuje `position: sticky` w środku (belka i pasek boczny odjeżdżałyby z treścią).
  return (
    <div className="min-h-[100svh] md:flex overflow-x-clip">
      {/* Left main navigation */}
      <AppSidebar
        section={section}
        onSection={setSection}
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
        onOpenTokens={() => setTokensOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        households={households}
        activeHouseholdId={mealHousehold?.id ?? null}
        onSelectHousehold={setMealHouseholdId}
        onOpenHouseholdSettings={setHouseholdSettingsId}
        onCreateHousehold={handleCreateHousehold}
        badges={{ chat: chatUnread, tasks: tasksBadge }}
      />

      {/* Content column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[100svh]">
      {/* Górna belka — jak w apce mobilnej: jeden niski wiersz, przyklejony do
          góry ekranu. Po lewej „gdzie jestem", po prawej kontekst (gospodarstwo),
          środek zostaje pusty, żeby belka oddychała. Padding u góry bierze pod
          uwagę notcha (viewport-fit=cover w index.html). */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-gray-50/85 dark:bg-gray-950/85 border-b border-gray-200 dark:border-gray-800 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-2 sm:px-4 h-12 sm:h-14">
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden relative min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all shrink-0"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {(chatUnread > 0 || tasksBadge) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-gray-50 dark:ring-gray-950" />
            )}
          </button>

          {/* Ikona bieżącej sekcji — ten sam kafelek co w menu, więc belka niesie
              tożsamość miejsca, w którym jesteś */}
          <SectionIcon className="w-7 h-7 text-primary-500 shrink-0 ml-1 md:ml-0" />

          <div className="min-w-0 flex-1">
            {section === 'tasks' && isCloud ? (
              <ListSelector
                lists={householdLists}
                activeList={activeList}
                activeHouseholdId={mealHousehold?.id ?? null}
                canCreate={mealHousehold?.role !== 'viewer'}
                onSelect={setActiveListId}
                onCreateList={createList}
                onOpenListSettings={setSettingsListId}
              />
            ) : (
              <h1 className="px-2 text-[15px] font-semibold truncate leading-tight">{sectionTitle}</h1>
            )}
          </div>

          {/* Prawa strona zagospodarowana tam, gdzie jest czym: na telefonie nie
              widać paska bocznego, więc belka niesie aktywne gospodarstwo i jest
              skrótem do szuflady, w której się je przełącza. */}
          {mealHousehold && (
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden flex items-center gap-1 max-w-[38%] min-h-10 px-2.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/60 active:scale-95 transition-all shrink-0"
            >
              <span className="truncate">{mealHousehold.name}</span>
              <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {section === 'meals' && (
        mealStorage && mealHousehold ? (
          <MealsSection storage={mealStorage} householdId={mealHousehold.id} />
        ) : (
          <p className="max-w-lg mx-auto px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Wczytywanie gospodarstwa…
          </p>
        )
      )}

      {section === 'home' && (
        <HomeSection householdId={mealHousehold?.id} />
      )}

      {section === 'finance' && (
        <FinanceSection householdId={mealHousehold?.id} />
      )}

      {section === 'chat' && (
        <ChatView
          isCloud={isCloud}
          householdId={mealHousehold?.id}
          householdName={mealHousehold?.name}
          currentUserId={user?.id}
          onLogin={login}
        />
      )}

      {section === 'tasks' && (
      <>
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
      <div className={`${STICKY_UNDER_HEADER} z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50 overflow-x-clip`}>
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
      </>
      )}

      {/* List settings modal */}
      {settingsList && (
        <ListSettings
          list={settingsList}
          households={households}
          onClose={() => setSettingsListId(null)}
          onUpdate={(listId, name) => { updateList(listId, name); }}
          onMove={(listId, householdId) => { moveList(listId, householdId); }}
          onDelete={handleDeleteList}
        />
      )}

      {/* API/MCP tokens modal */}
      {tokensOpen && (
        <TokensSettings households={households} onClose={() => setTokensOpen(false)} />
      )}

      {/* Appearance settings modal (opened from the profile) */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Household settings modal */}
      {settingsHousehold && (
        <HouseholdSettings
          household={settingsHousehold}
          currentUserId={user?.id}
          onClose={() => setHouseholdSettingsId(null)}
          onRename={handleRenameHousehold}
          onLeft={async () => {
            await refreshHouseholds();
            await refreshLists();
            triggerRefresh();
          }}
        />
      )}
      </div>
    </div>
  );
}
