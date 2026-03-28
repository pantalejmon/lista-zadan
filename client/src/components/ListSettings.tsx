import { useState, useEffect, useCallback } from 'react';
import type { ListMember, ListRole, TodoList } from '../lib/types';
import * as api from '../lib/api';

interface ListSettingsProps {
  list: TodoList;
  onClose: () => void;
  onUpdate: (listId: string, name: string) => void;
  onDelete: (listId: string) => void;
}

export function ListSettings({ list, onClose, onUpdate, onDelete }: ListSettingsProps) {
  const [name, setName] = useState(list.name);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ListRole>('editor');
  const [loading, setLoading] = useState(true);
  const [inviteSuccess, setInviteSuccess] = useState('');

  const loadMembers = useCallback(async () => {
    const result = await api.getListMembers(list.id);
    setMembers(result);
    setLoading(false);
  }, [list.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== list.name) {
      onUpdate(list.id, trimmed);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    await api.inviteToList(list.id, email, inviteRole);
    setInviteSuccess(email);
    setInviteEmail('');
    setTimeout(() => setInviteSuccess(''), 3000);
    await loadMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    await api.removeListMember(list.id, memberId);
    await loadMembers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md sm:mx-4 p-5 space-y-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Ustawienia listy</h2>
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
              className="flex-1 text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.displayName || member.email}</p>
                    {member.displayName && (
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {member.role === 'owner' ? 'właściciel' : member.role === 'editor' ? 'edytor' : 'podgląd'}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Zaproś</label>
          <div className="mt-1 space-y-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleInvite(); } }}
              placeholder="email@example.com"
              className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 placeholder-gray-400"
            />
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

        {/* Delete */}
        {!list.isDefault && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { if (confirm('Usunąć listę? Wszystkie zadania zostaną usunięte.')) { onDelete(list.id); onClose(); } }}
              className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              Usuń listę
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
