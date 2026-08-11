import { useState } from 'react';
import {
  createAsset,
  updateAsset,
  ASSET_TYPES,
  type HomeAsset,
  type AssetInput,
} from './homeApi';

interface AssetFormProps {
  householdId: string;
  asset: HomeAsset | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AssetForm({ householdId, asset, onClose, onSaved }: AssetFormProps) {
  const [name, setName] = useState(asset?.name ?? '');
  const [type, setType] = useState(asset?.type ?? ASSET_TYPES[0]);
  const [location, setLocation] = useState(asset?.location ?? '');
  const [installedAt, setInstalledAt] = useState(asset?.installedAt ?? '');
  const [warrantyUntil, setWarrantyUntil] = useState(asset?.warrantyUntil ?? '');
  const [model, setModel] = useState(asset?.model ?? '');
  const [serial, setSerial] = useState(asset?.serial ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type.trim()) {
      return;
    }
    setBusy(true);
    const input: AssetInput = {
      name: name.trim(),
      type: type.trim(),
      location: location.trim() || undefined,
      installedAt: installedAt || undefined,
      warrantyUntil: warrantyUntil || undefined,
      model: model.trim() || undefined,
      serial: serial.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (asset) {
        await updateAsset(asset.id, input);
      } else {
        await createAsset(householdId, input);
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
          <h2 className="font-semibold">{asset ? 'Edytuj instalację' : 'Nowa instalacja'}</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Zamknij">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <Field label="Nazwa" htmlFor="asset-name">
            <input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="np. Piec gazowy" className={inputClass} />
          </Field>
          <Field label="Typ" htmlFor="asset-type">
            <input id="asset-type" list="asset-types" value={type} onChange={(e) => setType(e.target.value)} required className={inputClass} />
            <datalist id="asset-types">
              {ASSET_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </Field>
          <Field label="Lokalizacja" htmlFor="asset-location">
            <input id="asset-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="np. Kotłownia" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zamontowano" htmlFor="asset-installed">
              <input id="asset-installed" type="date" value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Gwarancja do" htmlFor="asset-warranty">
              <input id="asset-warranty" type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Model" htmlFor="asset-model">
              <input id="asset-model" value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Nr seryjny" htmlFor="asset-serial">
              <input id="asset-serial" value={serial} onChange={(e) => setSerial(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Notatki" htmlFor="asset-notes">
            <textarea id="asset-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </Field>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button type="submit" disabled={busy || !name.trim()} className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all">
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
