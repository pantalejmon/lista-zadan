import { useState, useEffect, useCallback } from 'react';
import {
  getRenovations,
  createRenovation,
  updateRenovation,
  deleteRenovation,
  type Renovation,
  type RenovationStatus,
  type RenovationInput,
  type ChecklistItem,
} from '../../lib/homeApi';
import { useHomeRealtime } from '../../hooks/useHomeRealtime';

const STATUS_META: Record<RenovationStatus, { label: string; badge: string }> = {
  planned: { label: 'Planowany', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  in_progress: { label: 'W toku', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  done: { label: 'Zakończony', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
};

function toInput(r: Renovation): RenovationInput {
  return {
    title: r.title,
    status: r.status,
    description: r.description ?? undefined,
    budget: r.budget ?? undefined,
    cost: r.cost ?? undefined,
    checklist: r.checklist,
  };
}

export function RenovationsView({ householdId }: { householdId?: string }) {
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Renovation | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!householdId) {
      return;
    }
    setRenovations(await getRenovations(householdId));
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useHomeRealtime(householdId, Boolean(householdId), () => { load(); });

  const handleDelete = async (r: Renovation) => {
    if (!confirm(`Usunąć remont „${r.title}"?`)) {
      return;
    }
    await deleteRenovation(r.id);
    load();
  };

  // Quick inline checklist toggle — persists the whole renovation with the flipped item.
  const toggleItem = async (r: Renovation, item: ChecklistItem) => {
    const checklist = r.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c));
    await updateRenovation(r.id, { ...toInput(r), checklist });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Remonty</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">Projekty, budżet vs koszt i checklisty</p>
        </div>
        {editing === null && (
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            Remont
          </button>
        )}
      </div>

      {editing !== null && householdId && (
        <RenovationForm
          householdId={householdId}
          renovation={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : renovations.length === 0 && editing === null ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">Brak remontów. Zaplanuj pierwszy projekt.</p>
      ) : (
        <div className="space-y-3">
          {renovations.map((r) => {
            const done = r.checklist.filter((c) => c.done).length;
            const overBudget = r.budget !== null && r.cost !== null && r.cost > r.budget;
            return (
              <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold truncate">{r.title}</h2>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span>
                    </div>
                    {(r.budget !== null || r.cost !== null) && (
                      <p className="text-xs mt-1">
                        <span className={overBudget ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                          koszt {r.cost ?? 0} zł
                        </span>
                        <span className="text-gray-400"> / budżet {r.budget ?? '—'} {r.budget !== null ? 'zł' : ''}</span>
                        {overBudget && <span className="text-red-500"> · przekroczony</span>}
                      </p>
                    )}
                    {r.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditing(r)} className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Edytuj">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(r)} className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Usuń">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {r.checklist.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-2">
                    <p className="text-[11px] text-gray-400 mb-1.5">Checklista {done}/{r.checklist.length}</p>
                    <ul className="space-y-1">
                      {r.checklist.map((item) => (
                        <li key={item.id}>
                          <button onClick={() => toggleItem(r, item)} className="flex items-center gap-2 text-sm text-left w-full group">
                            <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                              item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent'
                            }`}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className={item.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}>{item.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass = 'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

interface DraftItem { id: string; text: string; done: boolean }

function RenovationForm({
  householdId,
  renovation,
  onClose,
  onSaved,
}: {
  householdId: string;
  renovation: Renovation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(renovation?.title ?? '');
  const [status, setStatus] = useState<RenovationStatus>(renovation?.status ?? 'planned');
  const [budget, setBudget] = useState(renovation?.budget?.toString() ?? '');
  const [cost, setCost] = useState(renovation?.cost?.toString() ?? '');
  const [description, setDescription] = useState(renovation?.description ?? '');
  const [items, setItems] = useState<DraftItem[]>(renovation?.checklist ?? []);
  const [newItem, setNewItem] = useState('');
  const [busy, setBusy] = useState(false);

  const addItem = () => {
    const text = newItem.trim();
    if (text) {
      setItems((prev) => [...prev, { id: crypto.randomUUID?.() ?? `${Date.now()}`, text, done: false }]);
      setNewItem('');
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      return;
    }
    setBusy(true);
    const budgetNum = parseFloat(budget);
    const costNum = parseFloat(cost);
    const input: RenovationInput = {
      title: title.trim(),
      status,
      description: description.trim() || undefined,
      budget: Number.isFinite(budgetNum) && budgetNum >= 0 ? budgetNum : undefined,
      cost: Number.isFinite(costNum) && costNum >= 0 ? costNum : undefined,
      checklist: items,
    };
    try {
      if (renovation) {
        await updateRenovation(renovation.id, input);
      } else {
        await createRenovation(householdId, input);
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-3 space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nazwa remontu (np. Remont łazienki)" className={inputClass} />
      {/* Na wąskim ekranie status bierze całą szerokość — w trzech kolumnach
          etykieta „Planowany" była ucinana przez natywny select */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RenovationStatus)}
          className={`${inputClass} col-span-2 sm:col-span-1`}
        >
          <option value="planned">Planowany</option>
          <option value="in_progress">W toku</option>
          <option value="done">Zakończony</option>
        </select>
        <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budżet" className={inputClass} />
        <input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Koszt" className={inputClass} />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Opis (opcjonalnie)" className={inputClass} />

      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Checklista</p>
        <ul className="space-y-1 mb-2">
          {items.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => setItems((prev) => prev.map((c, i) => (i === idx ? { ...c, done: e.target.checked } : c)))}
                className="w-4 h-4 rounded accent-primary-500"
              />
              <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : ''}`}>{item.text}</span>
              <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 p-1" aria-label="Usuń pozycję">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            placeholder="Dodaj krok..."
            className={inputClass}
          />
          <button onClick={addItem} className="shrink-0 px-3 rounded-xl text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">+</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Anuluj</button>
        <button onClick={submit} disabled={busy || !title.trim()} className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
          {busy ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}
