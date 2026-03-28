import { useState, useEffect, useCallback } from 'react';
import type { Todo, RecurrenceConfig } from '../lib/types';
import type { TodoStorage } from '../lib/storage';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTodos(date: string, storage: TodoStorage, listId?: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const items = await storage.getTodosByDate(date, listId);
    items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.createdAt - b.createdAt;
    });
    setTodos(items);
    setLoading(false);
  }, [date, storage, listId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (text: string, time?: string) => {
      const todo: Todo = {
        id: generateId(),
        text,
        completed: false,
        date,
        time: time || undefined,
        createdAt: Date.now(),
        listId,
      };
      await storage.addTodo(todo);
      await refresh();
    },
    [date, storage, refresh, listId]
  );

  const addRecurring = useCallback(
    async (text: string, time: string | undefined, config: RecurrenceConfig) => {
      await storage.addRecurringTodos(text, time, config, listId);
      await refresh();
    },
    [storage, refresh, listId]
  );

  const toggle = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      await storage.updateTodo({ ...todo, completed: !todo.completed });
      await refresh();
    },
    [todos, storage, refresh]
  );

  const update = useCallback(
    async (id: string, text: string, time?: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      await storage.updateTodo({ ...todo, text, time: time || undefined });
      await refresh();
    },
    [todos, storage, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await storage.deleteTodo(id);
      await refresh();
    },
    [storage, refresh]
  );

  const removeRecurrenceGroup = useCallback(
    async (groupId: string) => {
      await storage.deleteRecurrenceGroup(groupId);
      await refresh();
    },
    [storage, refresh]
  );

  return { todos, loading, add, addRecurring, toggle, update, remove, removeRecurrenceGroup, refresh };
}
