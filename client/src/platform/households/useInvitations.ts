import { useState, useEffect, useCallback } from 'react';
import type { HouseholdInvitation } from './household.types';
import * as api from './householdsApi';

export function useInvitations(isCloud: boolean) {
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isCloud) {
      setInvitations([]);
      return;
    }
    setLoading(true);
    const result = await api.getPendingInvitations();
    setInvitations(result);
    setLoading(false);
  }, [isCloud]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = useCallback(async (id: string) => {
    await api.acceptInvitation(id);
    await load();
  }, [load]);

  const decline = useCallback(async (id: string) => {
    await api.declineInvitation(id);
    await load();
  }, [load]);

  return { invitations, loading, accept, decline, refresh: load };
}
