import { useState, useEffect, useCallback } from 'react';
import {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  type Provider,
  type ProviderInput,
} from './homeApi';
import { useHomeRealtime } from './useHomeRealtime';

export function ProvidersView({ householdId }: { householdId?: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Provider | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!householdId) {
      return;
    }
    setProviders(await getProviders(householdId));
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useHomeRealtime(householdId, Boolean(householdId), () => { load(); });

  const handleDelete = async (p: Provider) => {
    if (!confirm(`Usunąć wykonawcę „${p.name}"?`)) {
      return;
    }
    await deleteProvider(p.id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wykonawcy</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">Hydraulik, elektryk, kominiarz… — kontakty i historia</p>
        </div>
        {editing === null && (
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            Dodaj
          </button>
        )}
      </div>

      {editing !== null && householdId && (
        <ProviderForm
          householdId={householdId}
          provider={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : providers.length === 0 && editing === null ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">Brak wykonawców. Dodaj hydraulika, elektryka czy kominiarza.</p>
      ) : (
        <ul className="space-y-2">
          {providers.map((p) => (
            <li key={p.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold break-words">{p.name}</span>
                  {p.trade && <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">{p.trade}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[p.phone, p.email].filter(Boolean).join(' · ') || 'Brak kontaktu'}
                </p>
                {p.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(p)} className="p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Edytuj">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => handleDelete(p)} className="p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Usuń">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputClass = 'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

function ProviderForm({
  householdId,
  provider,
  onClose,
  onSaved,
}: {
  householdId: string;
  provider: Provider | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(provider?.name ?? '');
  const [trade, setTrade] = useState(provider?.trade ?? '');
  const [phone, setPhone] = useState(provider?.phone ?? '');
  const [email, setEmail] = useState(provider?.email ?? '');
  const [notes, setNotes] = useState(provider?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      return;
    }
    setBusy(true);
    const input: ProviderInput = {
      name: name.trim(),
      trade: trade.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (provider) {
        await updateProvider(provider.id, input);
      } else {
        await createProvider(householdId, input);
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-3 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa / imię (np. Jan Kowalski)" className={inputClass} />
      <input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="Specjalizacja (np. hydraulik)" list="trades" className={inputClass} />
      <datalist id="trades">
        {['hydraulik', 'elektryk', 'kominiarz', 'gazownik', 'serwis klimatyzacji', 'ogólnobudowlany'].map((t) => <option key={t} value={t} />)}
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className={inputClass} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className={inputClass} />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notatki" className={inputClass} />
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Anuluj</button>
        <button onClick={submit} disabled={busy || !name.trim()} className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
          {busy ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}
