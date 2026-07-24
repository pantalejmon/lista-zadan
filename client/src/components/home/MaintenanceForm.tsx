import { useState, useEffect } from 'react';
import {
  createMaintenance,
  updateMaintenance,
  getProviders,
  type Maintenance,
  type MaintenanceInput,
  type Provider,
} from '../../lib/homeApi';

interface MaintenanceFormProps {
  householdId: string;
  assetId: string;
  maintenance: Maintenance | null;
  onClose: () => void;
  onSaved: () => void;
}

// Common inspection types for quick pick.
const MAINTENANCE_TYPES = [
  'Przegląd gazowy',
  'Przegląd kominiarski',
  'Przegląd elektryczny',
  'Serwis klimatyzacji',
  'Wymiana filtra',
  'Serwis pompy ciepła',
  'Przegląd gaśnicy',
];

export function MaintenanceForm({ householdId, assetId, maintenance, onClose, onSaved }: MaintenanceFormProps) {
  const [type, setType] = useState(maintenance?.type ?? '');
  const [intervalMonths, setIntervalMonths] = useState(maintenance?.intervalMonths?.toString() ?? '12');
  const [lastDoneAt, setLastDoneAt] = useState(maintenance?.lastDoneAt ?? '');
  const [nextDueAt, setNextDueAt] = useState(maintenance?.nextDueAt ?? '');
  const [cost, setCost] = useState(maintenance?.cost?.toString() ?? '');
  const [notes, setNotes] = useState(maintenance?.notes ?? '');
  const [providerId, setProviderId] = useState(maintenance?.providerId ?? '');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getProviders(householdId).then(setProviders).catch(() => undefined);
  }, [householdId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type.trim()) {
      return;
    }
    setBusy(true);
    const interval = parseInt(intervalMonths, 10);
    const costNum = parseFloat(cost);
    const input: MaintenanceInput = {
      assetId,
      type: type.trim(),
      intervalMonths: Number.isFinite(interval) && interval > 0 ? interval : undefined,
      lastDoneAt: lastDoneAt || undefined,
      nextDueAt: nextDueAt || undefined,
      cost: Number.isFinite(costNum) && costNum >= 0 ? costNum : undefined,
      notes: notes.trim() || undefined,
      providerId: providerId || undefined,
    };
    try {
      if (maintenance) {
        await updateMaintenance(maintenance.id, input);
      } else {
        await createMaintenance(householdId, input);
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold">{maintenance ? 'Edytuj przegląd' : 'Nowy przegląd / serwis'}</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Zamknij">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <Field label="Rodzaj" htmlFor="m-type">
            <input id="m-type" list="maintenance-types" value={type} onChange={(e) => setType(e.target.value)} required placeholder="np. Przegląd gazowy" className={inputClass} />
            <datalist id="maintenance-types">
              {MAINTENANCE_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </Field>
          <Field label="Interwał (miesiące)" htmlFor="m-interval">
            <input id="m-interval" type="number" min={1} value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} placeholder="np. 12 (puste = jednorazowy)" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ostatnio wykonano" htmlFor="m-last">
              <input id="m-last" type="date" value={lastDoneAt} onChange={(e) => setLastDoneAt(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Następny termin" htmlFor="m-next">
              <input id="m-next" type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <p className="text-[11px] text-gray-400 -mt-1">
            Zostaw „następny termin" pusty — policzymy go z ostatniego wykonania + interwału.
          </p>
          <Field label="Koszt (zł)" htmlFor="m-cost">
            <input id="m-cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Wykonawca" htmlFor="m-provider">
            <select id="m-provider" value={providerId} onChange={(e) => setProviderId(e.target.value)} className={inputClass}>
              <option value="">— brak —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.trade ? ` (${p.trade})` : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Notatki" htmlFor="m-notes">
            <textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </Field>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button type="submit" disabled={busy || !type.trim()} className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all">
            {busy ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = 'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
