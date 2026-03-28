import { useState, useEffect, useCallback } from 'react';
import type { TodoList } from '../lib/types';
import * as api from '../lib/api';

export function useLists(isCloud: boolean) {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isCloud) {
      setLists([]);
      setActiveListId(null);
      setLoading(false);
      return;
    }
    const result = await api.getLists();
    setLists(result);
    setActiveListId((prev) => {
      if (prev && result.some((l) => l.id === prev)) {
        return prev;
      }
      const defaultList = result.find((l) => l.isDefault);
      return defaultList?.id ?? result[0]?.id ?? null;
    });
    setLoading(false);
  }, [isCloud]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const createList = useCallback(async (name: string) => {
    const list = await api.createList(name);
    await load();
    return list;
  }, [load]);

  const updateList = useCallback(async (listId: string, name: string) => {
    await api.updateList(listId, name);
    await load();
  }, [load]);

  const deleteList = useCallback(async (listId: string) => {
    await api.deleteList(listId);
    await load();
  }, [load]);

  const activeList = lists.find((l) => l.id === activeListId) ?? null;

  return {
    lists,
    activeList,
    activeListId,
    setActiveListId,
    loading,
    createList,
    updateList,
    deleteList,
    refresh: load,
  };
}
