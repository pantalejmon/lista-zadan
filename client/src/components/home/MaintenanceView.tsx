import { useState, useEffect, useCallback } from 'react';
import {
  getAssets,
  deleteAsset,
  completeMaintenance,
  deleteMaintenance,
  type HomeAsset,
  type Maintenance,
  type MaintenanceStatus,
} from '../../lib/homeApi';
import { useHomeRealtime } from '../../hooks/useHomeRealtime';
import { AssetForm } from './AssetForm';
import { MaintenanceForm } from './MaintenanceForm';
import { CompleteForm } from './CompleteForm';
import { RemindModal } from './RemindModal';

interface MaintenanceViewProps {
  householdId?: string;
}

const STATUS_META: Record<MaintenanceStatus, { label: string; badge: string; dot: string }> = {
  overdue: { label: 'Po terminie', badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400', dot: 'bg-red-500' },
  soon: { label: 'Zbliża się', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', dot: 'bg-amber-500' },
  ok: { label: 'Aktualny', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500' },
  none: { label: 'Bez terminu', badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function dueLabel(m: Maintenance): string {
  if (!m.nextDueAt) {
    return 'brak terminu';
  }
  if (m.daysUntilDue === null) {
    return formatDate(m.nextDueAt);
  }
  if (m.daysUntilDue < 0) {
    return `${formatDate(m.nextDueAt)} · ${Math.abs(m.daysUntilDue)} dni po terminie`;
  }
  if (m.daysUntilDue === 0) {
    return `${formatDate(m.nextDueAt)} · dziś`;
  }
  return `${formatDate(m.nextDueAt)} · za ${m.daysUntilDue} dni`;
}

export function MaintenanceView({ householdId }: MaintenanceViewProps) {
  const [assets, setAssets] = useState<HomeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetForm, setAssetForm] = useState<{ asset: HomeAsset | null } | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<{ assetId: string; maintenance: Maintenance | null } | null>(null);
  const [completing, setCompleting] = useState<Maintenance | null>(null);
  const [reminding, setReminding] = useState<{ maintenance: Maintenance; assetName: string } | null>(null);

  const load = useCallback(async () => {
    if (!householdId) {
      return;
    }
    setAssets(await getAssets(householdId));
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useHomeRealtime(householdId, Boolean(householdId), () => { load(); });

  const handleDeleteAsset = async (asset: HomeAsset) => {
    if (!confirm(`Usunąć „${asset.name}" wraz z przeglądami?`)) {
      return;
    }
    await deleteAsset(asset.id);
    load();
  };

  const handleDeleteMaintenance = async (m: Maintenance) => {
    if (!confirm(`Usunąć przegląd „${m.type}"?`)) {
      return;
    }
    await deleteMaintenance(m.id);
    load();
  };

  const handleComplete = async (doneAt: string, cost?: number) => {
    if (!completing) {
      return;
    }
    await completeMaintenance(completing.id, doneAt, cost);
    setCompleting(null);
    load();
  };

  // Cross-asset agenda: everything overdue or coming up soon, soonest first.
  const agenda = assets
    .flatMap((a) => a.maintenance.map((m) => ({ m, asset: a })))
    .filter((x) => x.m.status === 'overdue' || x.m.status === 'soon')
    .sort((a, b) => (a.m.nextDueAt ?? '').localeCompare(b.m.nextDueAt ?? ''));

  return (
    <>
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold">Przeglądy</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">Instalacje, przeglądy cykliczne i gwarancje</p>
          </div>
          <button
            onClick={() => setAssetForm({ asset: null })}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            Instalacja
          </button>
        </div>

        {/* Agenda — overdue + upcoming */}
        {agenda.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <p className="px-4 py-2.5 text-sm font-semibold bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              Nadchodzące i po terminie ({agenda.length})
            </p>
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {agenda.map(({ m, asset }) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_META[m.status].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.type}</p>
                    <p className="text-xs text-gray-400 truncate">{asset.name} · {dueLabel(m)}</p>
                  </div>
                  <button
                    onClick={() => setReminding({ maintenance: m, assetName: asset.name })}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:underline shrink-0"
                  >
                    → Zadania
                  </button>
                  <button
                    onClick={() => setCompleting(m)}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline shrink-0"
                  >
                    Odhacz
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p>Brak instalacji.</p>
            <p className="text-sm mt-1">Dodaj piec, klimatyzację czy komin i pilnuj ich przeglądów.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={() => setAssetForm({ asset })}
                onDelete={() => handleDeleteAsset(asset)}
                onAddMaintenance={() => setMaintenanceForm({ assetId: asset.id, maintenance: null })}
                onEditMaintenance={(m) => setMaintenanceForm({ assetId: asset.id, maintenance: m })}
                onCompleteMaintenance={(m) => setCompleting(m)}
                onDeleteMaintenance={handleDeleteMaintenance}
              />
            ))}
          </div>
        )}
      </div>

      {assetForm && householdId && (
        <AssetForm
          householdId={householdId}
          asset={assetForm.asset}
          onClose={() => setAssetForm(null)}
          onSaved={() => { setAssetForm(null); load(); }}
        />
      )}

      {maintenanceForm && householdId && (
        <MaintenanceForm
          householdId={householdId}
          assetId={maintenanceForm.assetId}
          maintenance={maintenanceForm.maintenance}
          onClose={() => setMaintenanceForm(null)}
          onSaved={() => { setMaintenanceForm(null); load(); }}
        />
      )}

      {completing && (
        <CompleteForm
          maintenance={completing}
          onClose={() => setCompleting(null)}
          onConfirm={handleComplete}
        />
      )}

      {reminding && (
        <RemindModal
          maintenance={reminding.maintenance}
          assetName={reminding.assetName}
          onClose={() => setReminding(null)}
        />
      )}
    </>
  );
}

function AssetCard({
  asset,
  onEdit,
  onDelete,
  onAddMaintenance,
  onEditMaintenance,
  onCompleteMaintenance,
  onDeleteMaintenance,
}: {
  asset: HomeAsset;
  onEdit: () => void;
  onDelete: () => void;
  onAddMaintenance: () => void;
  onEditMaintenance: (m: Maintenance) => void;
  onCompleteMaintenance: (m: Maintenance) => void;
  onDeleteMaintenance: (m: Maintenance) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold truncate">{asset.name}</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">{asset.type}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {[asset.location, asset.model, asset.warrantyUntil ? `gwarancja do ${formatDate(asset.warrantyUntil)}` : null]
              .filter(Boolean)
              .join(' · ') || 'Brak dodatkowych danych'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Edytuj instalację">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Usuń instalację">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {asset.maintenance.length > 0 && (
        <ul className="divide-y divide-gray-50 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
          {asset.maintenance.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_META[m.status].badge}`}>{STATUS_META[m.status].label}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{m.type}</p>
                <p className="text-xs text-gray-400 truncate">
                  {dueLabel(m)}
                  {m.intervalMonths ? ` · co ${m.intervalMonths} mies.` : ''}
                  {m.cost !== null ? ` · ${m.cost} zł` : ''}
                  {m.providerName ? ` · ${m.providerName}` : ''}
                </p>
              </div>
              <button onClick={() => onCompleteMaintenance(m)} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline shrink-0" title="Oznacz jako wykonany">
                Odhacz
              </button>
              <button onClick={() => onEditMaintenance(m)} className="p-1 rounded text-gray-300 hover:text-primary-600 shrink-0" aria-label="Edytuj przegląd">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => onDeleteMaintenance(m)} className="p-1 rounded text-gray-300 hover:text-red-500 shrink-0" aria-label="Usuń przegląd">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onAddMaintenance}
        className="w-full px-4 py-2.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-1.5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
        </svg>
        Dodaj przegląd / serwis
      </button>
    </div>
  );
}
