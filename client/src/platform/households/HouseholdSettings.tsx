import { useState, useEffect, useCallback } from 'react';
import type { Household, HouseholdMember, ContactSuggestion, ListRole } from '@platform/api/types';
import * as api from '@platform/api/api';

interface HouseholdSettingsProps {
  household: Household;
  currentUserId?: string;
  onClose: () => void;
  onRename: (householdId: string, name: string) => void;
  onLeft?: () => void;
}

const ROLE_LABEL: Record<ListRole, string> = {
  owner: 'właściciel',
  editor: 'edytor',
  viewer: 'podgląd',
};

export function HouseholdSettings({ household, currentUserId, onClose, onRename, onLeft }: HouseholdSettingsProps) {
  const [name, setName] = useState(household.name);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [contacts, setContacts] = useState<ContactSuggestion[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ListRole>('editor');
  const [loading, setLoading] = useState(true);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [error, setError] = useState('');
  const canManage = household.role === 'owner';

  const ownersCount = members.filter((m) => m.role === 'owner').length;

  const loadMembers = useCallback(async () => {
    const result = await api.getHouseholdMembers(household.id);
    setMembers(result);
    setLoading(false);
  }, [household.id]);

  useEffect(() => {
    loadMembers();
    api.getContactSuggestions().then(setContacts).catch(() => setContacts([]));
  }, [loadMembers]);

  const handleRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== household.name) {
      onRename(household.id, trimmed);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      return;
    }
    await api.inviteToHousehold(household.id, email, inviteRole);
    setInviteSuccess(email);
    setInviteEmail('');
    setTimeout(() => setInviteSuccess(''), 3000);
    await loadMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    setError('');
    try {
      await api.removeHouseholdMember(household.id, memberId);
      await loadMembers();
    } catch {
      setError('Nie udało się usunąć członka.');
    }
  };

  const handleChangeRole = async (memberId: string, role: ListRole) => {
    setError('');
    try {
      await api.changeMemberRole(household.id, memberId, role);
      await loadMembers();
    } catch {
      setError('Nie udało się zmienić roli — w gospodarstwie musi zostać co najmniej jeden właściciel.');
    }
  };

  const handleLeave = async () => {
    if (household.role === 'owner' && ownersCount <= 1) {
      setError('Jesteś jedynym właścicielem — najpierw nadaj komuś rolę właściciela.');
      return;
    }
    if (!confirm(`Opuścić gospodarstwo „${household.name}”?`)) {
      return;
    }
    setError('');
    try {
      await api.leaveHousehold(household.id);
      onLeft?.();
      onClose();
    } catch {
      setError('Nie udało się opuścić gospodarstwa.');
    }
  };

  // suggest only contacts who are not already members
  const memberIds = new Set(members.map((m) => m.userId));
  const availableContacts = contacts.filter((c) => !memberIds.has(c.userId));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md sm:mx-4 p-5 space-y-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Gospodarstwo</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Rename */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Nazwa</label>
          <div className="flex gap-2 mt-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleRename(); } }}
              disabled={!canManage}
              className="flex-1 text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Members */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Członkowie</label>
          <div className="mt-1 space-y-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const editable = canManage && !isSelf;
                return (
                  <div key={member.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.displayName || member.email}
                        {isSelf && <span className="ml-1 text-xs text-gray-400">(Ty)</span>}
                      </p>
                      {member.displayName && (
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editable ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as ListRole)}
                          className="text-xs px-1.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                          <option value="owner">właściciel</option>
                          <option value="editor">edytor</option>
                          <option value="viewer">podgląd</option>
                        </select>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {ROLE_LABEL[member.role]}
                        </span>
                      )}
                      {editable && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Usuń członka"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Invite — with contact autocomplete */}
        {canManage && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Zaproś</label>
            <div className="mt-1 space-y-2">
              <input
                type="email"
                list="contact-suggestions"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleInvite(); } }}
                placeholder="email@example.com"
                className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 placeholder-gray-400"
              />
              <datalist id="contact-suggestions">
                {availableContacts.map((c) => (
                  <option key={c.userId} value={c.email}>{c.displayName}</option>
                ))}
              </datalist>
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as ListRole)}
                  className="text-xs px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                >
                  <option value="editor">Edytor</option>
                  <option value="viewer">Podgląd</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="text-xs font-medium px-3 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  Zaproś
                </button>
              </div>
            </div>
            {inviteSuccess && (
              <p className="mt-2 text-xs text-emerald-500 animate-fadeIn">
                Zaproszenie wysłane do {inviteSuccess}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 animate-fadeIn">{error}</p>
        )}

        {/* Leave household */}
        {!loading && members.some((m) => m.userId === currentUserId) && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleLeave}
              className="w-full text-sm font-medium px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Opuść gospodarstwo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
