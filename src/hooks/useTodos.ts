import { useState, useEffect, useCallback } from 'react';
import type { Todo, RecurrenceConfig } from '../lib/types';
import * as db from '../lib/db';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTodos(date: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const items = await db.getTodosByDate(date);
    items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.createdAt - b.createdAt;
    });
    setTodos(items);
    setLoading(false);
  }, [date]);

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
      };
      await db.addTodo(todo);
      await refresh();
    },
    [date, refresh]
  );

  const addRecurring = useCallback(
    async (text: string, time: string | undefined, config: RecurrenceConfig) => {
      await db.addRecurringTodos(text, time, config);
      await refresh();
    },
    [refresh]
  );

  const toggle = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      await db.updateTodo({ ...todo, completed: !todo.completed });
      await refresh();
    },
    [todos, refresh]
  );

  const update = useCallback(
    async (id: string, text: string, time?: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      await db.updateTodo({ ...todo, text, time: time || undefined });
      await refresh();
    },
    [todos, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await db.deleteTodo(id);
      await refresh();
    },
    [refresh]
  );

  const removeRecurrenceGroup = useCallback(
    async (groupId: string) => {
      await db.deleteRecurrenceGroup(groupId);
      await refresh();
    },
    [refresh]
  );

  return { todos, loading, add, addRecurring, toggle, update, remove, removeRecurrenceGroup, refresh };
}
