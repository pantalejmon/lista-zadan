import { useState } from 'react';
import type { TodoList, Household } from '@platform/households/household.types';

interface ListSettingsProps {
  list: TodoList;
  households: Household[];
  onClose: () => void;
  onUpdate: (listId: string, name: string) => void;
  onMove: (listId: string, householdId: string) => void;
  onDelete: (listId: string) => void;
}

export function ListSettings({ list, households, onClose, onUpdate, onMove, onDelete }: ListSettingsProps) {
  const [name, setName] = useState(list.name);
  const canManage = list.role === 'owner' || list.role === 'editor';

  // Można przenieść tylko do gospodarstwa, w którym mam prawo edycji.
  const moveTargets = households.filter(
    (h) => h.id !== list.householdId && (h.role === 'owner' || h.role === 'editor'),
  );
  const [targetHouseholdId, setTargetHouseholdId] = useState('');

  const handleRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== list.name) {
      onUpdate(list.id, trimmed);
    }
  };

  const handleMove = () => {
    if (targetHouseholdId) {
      onMove(list.id, targetHouseholdId);
      onClose();
    }
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
              disabled={!canManage}
              className="flex-1 text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Należy do gospodarstwa <strong>{list.householdName}</strong>. Członków i zaproszenia
            znajdziesz w ustawieniach gospodarstwa.
          </p>
        </div>

        {/* Move to another household */}
        {canManage && moveTargets.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Przenieś do innego gospodarstwa
            </label>
            <div className="flex gap-2 mt-1">
              <select
                value={targetHouseholdId}
                onChange={(e) => setTargetHouseholdId(e.target.value)}
                className="flex-1 text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <option value="">Wybierz gospodarstwo…</option>
                {moveTargets.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <button
                onClick={handleMove}
                disabled={!targetHouseholdId}
                className="text-sm font-medium px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Przenieś
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Lista wraz ze wszystkimi zadaniami trafi do wybranego gospodarstwa.
            </p>
          </div>
        )}

        {/* Delete */}
        {!list.isDefault && canManage && (
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
