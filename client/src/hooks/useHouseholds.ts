import { useState, useEffect, useCallback } from 'react';
import type { Household } from '../lib/types';
import * as api from '../lib/api';

export function useHouseholds(isCloud: boolean) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isCloud) {
      setHouseholds([]);
      setLoading(false);
      return;
    }
    const result = await api.getHouseholds();
    setHouseholds(result);
    setLoading(false);
  }, [isCloud]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const createHousehold = useCallback(async (name: string) => {
    const household = await api.createHousehold(name);
    await load();
    return household;
  }, [load]);

  const renameHousehold = useCallback(async (householdId: string, name: string) => {
    await api.renameHousehold(householdId, name);
    await load();
  }, [load]);

  return { households, loading, createHousehold, renameHousehold, refresh: load };
}
