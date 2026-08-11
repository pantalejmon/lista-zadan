import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { TodoStorage } from '@platform/storage/storage';

export interface DayCounts {
  [date: string]: { total: number; completed: number };
}

export function useTodoCounts(currentMonth: Date, refreshKey: number, storage: TodoStorage, listId?: string) {
  const [counts, setCounts] = useState<DayCounts>({});

  useEffect(() => {
    (async () => {
      const allTodos = await storage.getAllTodos(listId);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start, end });
      const result: DayCounts = {};

      for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        const dayTodos = allTodos.filter((t) => t.date === key);
        if (dayTodos.length > 0) {
          result[key] = {
            total: dayTodos.length,
            completed: dayTodos.filter((t) => t.completed).length,
          };
        }
      }
      setCounts(result);
    })();
  }, [currentMonth, refreshKey, storage, listId]);

  return counts;
}
