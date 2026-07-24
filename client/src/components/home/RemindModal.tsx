import { useState, useEffect } from 'react';
import { getLists, addTodo } from '../../lib/api';
import type { TodoList } from '../../lib/types';
import type { Maintenance } from '../../lib/homeApi';

interface RemindModalProps {
  maintenance: Maintenance;
  assetName: string;
  onClose: () => void;
}

// #40 — turns an upcoming/overdue maintenance into a todo on a chosen list
// (e.g. a specific member's), dated to the next due date. Frontend-only, via the
// existing todo API — no coupling between the home and todo modules.
export function RemindModal({ maintenance, assetName, onClose }: RemindModalProps) {
  const [lists, setLists] = useState<TodoList[] | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLists()
      .then((ls) => {
        const writable = ls.filter((l) => l.role !== 'viewer');
        setLists(writable);
        const preferred = writable.find((l) => l.isDefault) ?? writable[0];
        if (preferred) {
          setSelected(preferred.id);
        }
      })
      .catch(() => setError('Nie udało się pobrać list zadań.'));
  }, []);

  const text = `Przegląd: ${maintenance.type} — ${assetName}`;

  const handleCreate = async () => {
    if (!selected) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addTodo({
        text,
        completed: false,
        listId: selected,
        date: maintenance.nextDueAt ?? undefined,
      });
      setDone(true);
    } catch {
      setError('Nie udało się utworzyć zadania.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold">Przypomnienie do zadań</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Zamknij">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium">Dodano zadanie{maintenance.nextDueAt ? ` na ${maintenance.nextDueAt}` : ''}.</p>
            </div>
          ) : (
            <>
              <p className="text-sm mb-3">
                <span className="font-medium">{text}</span>
                {maintenance.nextDueAt ? <span className="text-gray-400"> · termin {maintenance.nextDueAt}</span> : null}
              </p>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Lista docelowa</p>
              {lists === null ? (
                <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
              ) : lists.length === 0 ? (
                <p className="text-sm text-gray-400 py-2 text-center">Brak list z prawem zapisu.</p>
              ) : (
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.householdName}</option>)}
                </select>
              )}
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
              <button onClick={handleCreate} disabled={busy || !selected} className="mt-4 w-full bg-primary-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all">
                {busy ? 'Dodawanie...' : 'Dodaj do zadań'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
