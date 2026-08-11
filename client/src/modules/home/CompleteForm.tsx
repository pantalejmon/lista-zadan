import { useState } from 'react';
import type { Maintenance } from './homeApi';

interface CompleteFormProps {
  maintenance: Maintenance;
  onClose: () => void;
  onConfirm: (doneAt: string, cost?: number) => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Confirms a maintenance as done: pick the date and optionally log the cost.
// The next due date is recomputed server-side from the interval.
export function CompleteForm({ maintenance, onClose, onConfirm }: CompleteFormProps) {
  const [doneAt, setDoneAt] = useState(todayIso());
  const [cost, setCost] = useState(maintenance.cost?.toString() ?? '');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const costNum = parseFloat(cost);
    onConfirm(doneAt || todayIso(), Number.isFinite(costNum) && costNum >= 0 ? costNum : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold">Odhacz wykonanie</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Zamknij">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200">{maintenance.type}</span>
            {maintenance.intervalMonths ? ` — kolejny termin policzymy za ${maintenance.intervalMonths} mies.` : ''}
          </p>
          <label htmlFor="complete-date" className="block">
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data wykonania</span>
            <input id="complete-date" type="date" value={doneAt} onChange={(e) => setDoneAt(e.target.value)} className={inputClass} />
          </label>
          <label htmlFor="complete-cost" className="block">
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Koszt (zł, opcjonalnie)</span>
            <input id="complete-cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button type="submit" disabled={busy} className="w-full bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all">
            {busy ? 'Zapisywanie...' : 'Wykonano'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = 'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
