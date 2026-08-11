import { useState, useEffect, useCallback } from 'react';
import type { TodoList } from '@platform/households/household.types';
import * as api from '@platform/households/householdsApi';

const STORAGE_KEY = 'lista-zadan:activeListId';

export function useLists(isCloud: boolean) {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [activeListId, setActiveListIdRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveListId = useCallback((id: string | null) => {
    setActiveListIdRaw(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const load = useCallback(async () => {
    if (!isCloud) {
      setLists([]);
      setActiveListIdRaw(null);
      setLoading(false);
      return;
    }
    const result = await api.getLists();
    setLists(result);
    setActiveListIdRaw((prev) => {
      const saved = prev ?? localStorage.getItem(STORAGE_KEY);
      if (saved && result.some((l) => l.id === saved)) {
        return saved;
      }
      const defaultList = result.find((l) => l.isDefault);
      const id = defaultList?.id ?? result[0]?.id ?? null;
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    });
    setLoading(false);
  }, [isCloud]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const createList = useCallback(async (name: string, householdId?: string) => {
    const list = await api.createList(name, householdId);
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

  const moveList = useCallback(async (listId: string, householdId: string) => {
    await api.moveList(listId, householdId);
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
    moveList,
    refresh: load,
  };
}
