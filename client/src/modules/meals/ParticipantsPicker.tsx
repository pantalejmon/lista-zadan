import { useState } from 'react';
import { PORTION_OPTIONS, type MealParticipant } from './meals';
import type { HouseholdMember } from '@platform/api/types';
import { IconClose } from './icons';

// Inicjały domownika — na kaflu planera nie ma miejsca na pełne imiona.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

// Rządek inicjałów na kaflu posiłku. Bez uczestników pokazuje zachętę, bo taki
// posiłek nie wchodzi do niczyjego bilansu.
export function ParticipantsBadges({
  participants,
  members,
  onClick,
}: {
  participants: MealParticipant[];
  members: HouseholdMember[];
  onClick: () => void;
}) {
  const byUser = new Map(members.map((m) => [m.userId, m]));
  const label = participants.length === 0
    ? 'Przypisz domowników'
    : participants
      .map((p) => `${byUser.get(p.userId)?.displayName ?? '?'}${p.portions === 1 ? '' : ` (${formatPortions(p.portions)})`}`)
      .join(', ');

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="mt-1 flex items-center gap-0.5 rounded px-0.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    >
      {participants.length === 0 ? (
        <span className="text-[10px] text-gray-400 dark:text-gray-500">+ kto je?</span>
      ) : (
        <>
          {participants.slice(0, 3).map((p) => (
            <span
              key={p.userId}
              className="w-4 h-4 rounded-full bg-primary-500/15 text-primary-700 dark:text-primary-300 text-[8px] font-semibold flex items-center justify-center"
            >
              {initials(byUser.get(p.userId)?.displayName ?? '?')}
            </span>
          ))}
          {participants.length > 3 && (
            <span className="text-[9px] text-gray-400">+{participants.length - 3}</span>
          )}
        </>
      )}
    </button>
  );
}

export function ParticipantsPicker({
  members,
  initial,
  servings,
  perServingKcal,
  onSave,
  onClose,
}: {
  members: HouseholdMember[];
  initial: MealParticipant[];
  // Ile porcji daje danie i ile kcal ma jedna — bez tego „1×" to liczba bez jednostki.
  servings: number;
  perServingKcal: number | null;
  onSave: (participants: MealParticipant[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Map<string, number>>(
    () => new Map(initial.map((p) => [p.userId, p.portions])),
  );

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.set(userId, 1);
      }
      return next;
    });
  };

  const setPortions = (userId: string, portions: number) => {
    setSelected((prev) => new Map(prev).set(userId, portions));
  };

  const selectAll = () => {
    setSelected(new Map(members.map((m) => [m.userId, selected.get(m.userId) ?? 1])));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="font-semibold">Kto je ten posiłek?</h2>
            {/* Bez tego zdania „1×" nic nie znaczy: tester czytał je jako „100% przepisu",
                a to mnożnik **jednej porcji** przypadającej na domownika (#113). */}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              1× = {servings > 1 ? `jedna z ${servings} porcji dania` : 'całe danie'}
              {perServingKcal !== null ? ` (≈ ${perServingKcal} kcal)` : ''}. Liczy się do bilansu domownika.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
            aria-label="Zamknij"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {members.length === 0 && (
            <p className="text-sm text-gray-400">Brak domowników do przypisania.</p>
          )}
          {members.map((member) => {
            const active = selected.has(member.userId);
            return (
              <div
                key={member.userId}
                className={`rounded-xl border transition-colors ${
                  active
                    ? 'border-primary-400 bg-primary-50/60 dark:bg-primary-500/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(member.userId)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-primary-500/15 text-primary-700 dark:text-primary-300 text-xs font-semibold flex items-center justify-center shrink-0">
                    {initials(member.displayName || member.email)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{member.displayName || member.email}</span>
                  </span>
                  <span
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      active ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {active && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </button>

                {active && (
                  <PortionPicker
                    value={selected.get(member.userId) ?? 1}
                    onChange={(portions) => setPortions(member.userId, portions)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Najczęstsze nieporozumienie: „a jak gotuję na 4 osoby?". Odpowiedź są dwie
            i obie warto powiedzieć wprost. */}
        <p className="px-4 pt-3 text-xs text-gray-400 dark:text-gray-500">
          Gotujesz dla większej liczby osób? Dopisz ich tutaj. Gotujesz więcej, niż dom zje
          (zapas, goście spoza domu)? Podnieś mnożnik w „Dopasuj porcje”.
        </p>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 mt-3">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Wszyscy
          </button>
          <button
            type="button"
            onClick={() => onSave([...selected.entries()].map(([userId, portions]) => ({ userId, portions })))}
            className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}

// Gotowe kroki załatwiają większość przypadków, ale nie wszystkie — „3×" albo „0,75×"
// musi dać się wpisać, zamiast zaokrąglać domownika do najbliższej pigułki (#113).
// Zakres 0,25–10 to ten sam, który waliduje serwer.
function PortionPicker({ value, onChange }: { value: number; onChange: (portions: number) => void }) {
  const isStep = PORTION_OPTIONS.includes(value);
  const [custom, setCustom] = useState(isStep ? '' : formatPortions(value).replace('×', ''));

  const commitCustom = (raw: string) => {
    setCustom(raw);
    const parsed = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0.25 && parsed <= 10) {
      onChange(parsed);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 pb-2.5">
      {PORTION_OPTIONS.map((portions) => (
        <button
          key={portions}
          type="button"
          onClick={() => { setCustom(''); onChange(portions); }}
          className={`flex-1 min-h-9 rounded-lg text-xs font-medium transition-colors ${
            value === portions
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          {formatPortions(portions)}
        </button>
      ))}
      <input
        type="number"
        inputMode="decimal"
        min="0.25"
        max="10"
        step="0.25"
        value={custom}
        onChange={(e) => commitCustom(e.target.value)}
        placeholder="inna"
        aria-label="Inna liczba porcji"
        className={`w-16 min-h-9 rounded-lg px-2 text-xs text-right tabular-nums bg-white dark:bg-gray-900 border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          !isStep ? 'border-primary-400 dark:border-primary-500' : 'border-gray-200 dark:border-gray-700'
        }`}
      />
    </div>
  );
}

function formatPortions(portions: number): string {
  return `${portions.toString().replace('.', ',')}×`;
}
