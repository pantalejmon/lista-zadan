import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Todo } from '../lib/types';
import type { TodoStorage } from '../lib/storage';
import { TodoItem } from './TodoItem';
import { ShoppingListItem } from './ShoppingListItem';

type TimeFilter = 'future' | 'past' | 'all';
type StatusFilter = 'all' | 'pending' | 'completed';

function formatGroupLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Dzisiaj';
  if (isTomorrow(date)) return 'Jutro';
  if (isYesterday(date)) return 'Wczoraj';
  return format(date, 'EEEE, d MMMM yyyy', { locale: pl });
}

interface AllTodosViewProps {
  refreshKey: number;
  onRefresh: () => void;
  storage: TodoStorage;
  listId?: string;
  allowUnassign?: boolean;
}

export function AllTodosView({ refreshKey, onRefresh, storage, listId, allowUnassign }: AllTodosViewProps) {
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('future');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const todos = await storage.getAllTodos(listId);
    setAllTodos(todos);
    setLoading(false);
  }, [storage, listId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshKey]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    let result = allTodos;

    // Only show dated todos in this view
    result = result.filter((t) => t.date);

    // Time filter
    if (timeFilter === 'future') {
      result = result.filter((t) => t.date! >= todayStr);
    } else if (timeFilter === 'past') {
      result = result.filter((t) => t.date! < todayStr);
    }

    // Status filter
    if (statusFilter === 'pending') {
      result = result.filter((t) => !t.completed);
    } else if (statusFilter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((t) => t.text.toLowerCase().includes(q));
    }

    return result;
  }, [allTodos, timeFilter, statusFilter, search, todayStr]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of filtered) {
      const date = todo.date!;
      const group = map.get(date) || [];
      group.push(todo);
      map.set(date, group);
    }
    // Sort groups by date
    const entries = [...map.entries()].sort((a, b) => {
      if (timeFilter === 'past') return b[0].localeCompare(a[0]); // newest first for past
      return a[0].localeCompare(b[0]); // earliest first for future
    });
    // Sort todos within each group by time
    for (const [, todos] of entries) {
      todos.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return a.createdAt - b.createdAt;
      });
    }
    return entries;
  }, [filtered, timeFilter]);

  const handleToggle = async (id: string) => {
    const todo = allTodos.find((t) => t.id === id);
    if (!todo) return;
    if (todo.kind === 'shopping') return;
    await storage.updateTodo({ ...todo, completed: !todo.completed });
    await load();
    onRefresh();
  };

  const handleUpdateFull = async (updated: Todo) => {
    await storage.updateTodo(updated);
    await load();
    onRefresh();
  };

  const handleUpdate = async (id: string, text: string, time?: string) => {
    const todo = allTodos.find((t) => t.id === id);
    if (!todo) return;
    await storage.updateTodo({ ...todo, text, time: time || undefined });
    await load();
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await storage.deleteTodo(id);
    await load();
    onRefresh();
  };

  const handleDeleteGroup = async (groupId: string) => {
    await storage.deleteRecurrenceGroup(groupId);
    await load();
    onRefresh();
  };

  const handleUnassign = async (id: string) => {
    const todo = allTodos.find((t) => t.id === id);
    if (!todo || !todo.date) return;
    const monthFromDate = todo.date.slice(0, 7);
    await storage.updateTodo({ ...todo, date: undefined, month: monthFromDate });
    await load();
    onRefresh();
  };

  const totalFiltered = filtered.length;
  const completedFiltered = filtered.filter((t) => t.completed).length;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj zadań..."
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 dark:focus:border-primary-700 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Time filter */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
          {([
            ['future', 'Przyszłe'],
            ['past', 'Przeszłe'],
            ['all', 'Wszystkie'],
          ] as [TimeFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTimeFilter(value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
          {([
            ['all', 'Wszystkie'],
            ['pending', 'Do zrobienia'],
            ['completed', 'Zrobione'],
          ] as [StatusFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {totalFiltered > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="h-1.5 flex-1 max-w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedFiltered / totalFiltered) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {completedFiltered}/{totalFiltered} zadań
          </span>
        </div>
      )}

      {/* Grouped list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {search ? 'Nie znaleziono zadań' : 'Brak zadań'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          {grouped.map(([dateStr, todos]) => {
            const dateObj = parseISO(dateStr);
            const isPastDate = dateStr < todayStr;
            return (
              <div key={dateStr} className="animate-fade-in">
                {/* Date header */}
                <div className="flex items-center gap-2 px-1 mb-2">
                  <h3
                    className={`text-sm font-semibold capitalize ${
                      isToday(dateObj)
                        ? 'text-primary-600 dark:text-primary-400'
                        : isPastDate
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {formatGroupLabel(dateStr)}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                    {todos.filter((t) => t.completed).length}/{todos.length}
                  </span>
                </div>

                {/* Todos */}
                <div className="space-y-1.5">
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
                        onUnassign={allowUnassign ? handleUnassign : undefined}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
