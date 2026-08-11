import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Todo } from '@platform/api/types';
import type { TodoStorage } from '@platform/storage/storage';
import { TodoItem } from './TodoItem';
import { ShoppingListItem } from './ShoppingListItem';

interface UnassignedViewProps {
  storage: TodoStorage;
  listId?: string;
  refreshKey: number;
  onRefresh: () => void;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  return format(date, 'LLLL yyyy', { locale: pl });
}

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const date = addMonths(now, i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'LLLL yyyy', { locale: pl });
    options.push({ value, label });
  }
  return options;
}

export function UnassignedView({ storage, listId, refreshKey, onRefresh }: UnassignedViewProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newMonth, setNewMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignDate, setAssignDate] = useState('');

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const load = useCallback(async () => {
    const result = await storage.getUnassignedTodos(listId);
    setTodos(result);
    setLoading(false);
  }, [storage, listId]);

  // Bez `setLoading(true)` przy odświeżeniu: każda zmiana w liście woła
  // `onRefresh()`, co podbija `refreshKey` — a wtedy spinner na moment zastępował
  // całą listę i przy odhaczaniu pozycji zakupów wyglądało to jak mryganie.
  // Widok kalendarza od początku odświeżał się bez tego i działał dobrze.
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      const key = todo.month ?? format(new Date(todo.createdAt), 'yyyy-MM');
      const group = map.get(key) || [];
      group.push(todo);
      map.set(key, group);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [todos]);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    await storage.addTodo({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      completed: false,
      month: newMonth,
      listId,
      createdAt: Date.now(),
    });
    setNewText('');
    await load();
    onRefresh();
  };

  const handleToggle = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
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
    const todo = todos.find((t) => t.id === id);
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

  const handleAssignDate = async (id: string) => {
    if (!assignDate) return;
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    await storage.updateTodo({ ...todo, date: assignDate, month: undefined });
    setAssigningId(null);
    setAssignDate('');
    await load();
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Add unassigned todo */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
        <div className="flex gap-2">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { handleAdd(); } }}
            placeholder="Nowe zadanie bez daty..."
            className="flex-1 text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 placeholder-gray-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={newMonth}
            onChange={(e) => setNewMonth(e.target.value)}
            className="text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none capitalize"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            Dodaj
          </button>
        </div>
      </div>

      {/* Grouped by month */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 dark:text-gray-500">Brak nieprzypisanych zadań</p>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          {grouped.map(([month, monthTodos]) => (
            <div key={month}>
              <div className="flex items-center gap-2 px-1 mb-2">
                <h3 className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">
                  {formatMonthLabel(month)}
                </h3>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {monthTodos.filter((t) => t.completed).length}/{monthTodos.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {monthTodos.map((todo) => (
                  <div key={todo.id}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        {todo.kind === 'shopping' ? (
                          <ShoppingListItem
                            todo={todo}
                            onUpdate={handleUpdateFull}
                            onDelete={handleDelete}
                          />
                        ) : (
                          <TodoItem
                            todo={todo}
                            onToggle={handleToggle}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        )}
                      </div>
                      {/* Assign date button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningId(assigningId === todo.id ? null : todo.id);
                          setAssignDate('');
                        }}
                        className="shrink-0 p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-500 transition-all"
                        title="Przypisz datę"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    {/* Date picker inline */}
                    {assigningId === todo.id && (
                      <div className="flex items-center gap-2 ml-8 mt-1 animate-fadeIn">
                        <input
                          type="date"
                          value={assignDate}
                          onChange={(e) => setAssignDate(e.target.value)}
                          className="text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <button
                          onClick={() => handleAssignDate(todo.id)}
                          disabled={!assignDate}
                          className="text-xs font-medium px-2 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
                        >
                          Przypisz
                        </button>
                        <button
                          onClick={() => { setAssigningId(null); setAssignDate(''); }}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          Anuluj
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
