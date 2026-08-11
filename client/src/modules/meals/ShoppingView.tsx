import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BASE_UNITS,
  getMonday,
  shiftWeek,
  weekLabel,
  isCurrentWeek,
  WEEK_DAYS,
  type BaseUnit,
  type MealStorage,
  type ShoppingItem,
  type NeedItem,
} from './meals';
import { getLists } from '@platform/households/householdsApi';
import { addTodo, updateTodo } from '@modules/tasks/tasksApi';
import type { TodoList } from '@platform/households/household.types';
import type { ShoppingItem as TodoShoppingItem } from '@modules/tasks/todo.types';
import { IconCalendar, IconCart, IconClose, IconCheck, IconChevronLeft, IconChevronRight } from './icons';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ShoppingView({ storage, liveKey = 0 }: { storage: MealStorage; liveKey?: number }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState<BaseUnit>('szt');
  const [pantryNote, setPantryNote] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showNeeds, setShowNeeds] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  // Which week + weekdays to shop for. Defaults: current week, every day.
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [days, setDays] = useState<number[]>(ALL_DAYS);

  // When all 7 days are selected, treat it as "whole week" (send no filter).
  const daysArg = useMemo(() => (days.length === ALL_DAYS.length ? undefined : days), [days]);

  const load = useCallback(async () => {
    const [shopping, weekNeeds] = await Promise.all([
      storage.getShopping(),
      storage.computeNeeds(weekStart, daysArg),
    ]);
    setItems(shopping);
    setNeeds(weekNeeds);
    setLoading(false);
  }, [storage, weekStart, daysArg]);

  useEffect(() => { load(); }, [load, liveKey]);

  // Komunikat po generowaniu opisuje **jedno** kliknięcie i przestaje być prawdziwy,
  // gdy user ruszy cokolwiek innego — więc każda inna akcja go kasuje (#108).
  const changeWeek = (next: string) => {
    setGenMessage(null);
    setWeekStart(next);
  };

  const toggleDay = (day: number) => {
    setGenMessage(null);
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) {
      return;
    }
    setGenMessage(null);
    setPantryNote(null);
    const quantity = parseFloat(newQty.replace(',', '.'));
    await storage.addShoppingItem(name, Number.isFinite(quantity) && quantity > 0 ? quantity : undefined, newUnit);
    setNewItem('');
    setNewQty('');
    load();
  };

  // „Kupione" dokłada pozycję do spiżarni — ale tylko z ilością i dopasowanym
  // produktem. Bez potwierdzenia cała pętla jest niewidoczna i wygląda, jakby nie
  // działała; bez wyjaśnienia przy pozycji bez ilości wygląda tak samo (#110).
  const handleToggle = async (item: ShoppingItem, isChecked: boolean) => {
    setGenMessage(null);
    const effect = await storage.toggleShoppingItem(item.id, isChecked);
    if (effect) {
      setPantryNote(
        effect.delta > 0
          ? `${effect.name}: +${effect.delta} ${effect.unit} w spiżarni.`
          : `${effect.name}: −${Math.abs(effect.delta)} ${effect.unit} ze spiżarni.`,
      );
    } else if (isChecked && !item.quantity) {
      setPantryNote(`„${item.name}" bez ilości — spiżarnia bez zmian. Podaj ilość, żeby stan liczył się sam.`);
    } else {
      setPantryNote(null);
    }
    load();
  };

  const handleRemove = async (id: string) => {
    setGenMessage(null);
    await storage.removeShoppingItem(id);
    load();
  };

  const handleGenerate = async () => {
    if (days.length === 0) {
      return;
    }
    setGenerating(true);
    setGenMessage(null);
    const count = await storage.generateShoppingFromPlan(weekStart, daysArg);
    setGenerating(false);
    // Zero pozycji ma dwa różne powody i user musi wiedzieć, na który trafił.
    setGenMessage(
      count > 0
        ? `Dodano ${count} ${count === 1 ? 'pozycję' : 'pozycji'} do listy.`
        : needs.length === 0
          ? 'Brak przepisów w wybranym zakresie. Zaplanuj posiłki w Planerze.'
          : 'Nic nie dodano — wszystko masz w spiżarni albo już na liście.',
    );
    load();
  };

  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);
  // Brakuje = brakuje **po odjęciu listy**. Pozycje, które user zdążył dopisać,
  // znikają z sekcji, ale mówimy ile ich było — inaczej wygląda to na zgubienie (#109).
  const missing = needs.filter((n) => n.toBuy > 0);
  const coveredByList = needs.filter((n) => n.shortfall > 0 && n.toBuy === 0).length;
  const current = isCurrentWeek(weekStart);
  const rangeLabel = daysArg
    ? `wybrane dni (${days.length})`
    : current
      ? 'ten tydzień'
      : weekLabel(weekStart);

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Lista zakupów</h1>
        {items.length > 0 && (
          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm border border-primary-500 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 active:scale-95 transition-all shrink-0"
          >
            <IconCart className="w-4 h-4" />
            Do listy zadań
          </button>
        )}
      </div>

      {exportOpen && (
        <ExportModal items={items} onClose={() => setExportOpen(false)} />
      )}

      {/* Generuj z planu — wybór tygodnia i dni */}
      <div className="mb-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => changeWeek(shiftWeek(weekStart, -1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 active:scale-95 transition-all"
            aria-label="Poprzedni tydzień"
          >
            <IconChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeWeek(getMonday(new Date()))}
            className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400"
            title="Wróć do bieżącego tygodnia"
          >
            {weekLabel(weekStart)}{current ? ' · ten tydzień' : ''}
          </button>
          <button
            onClick={() => changeWeek(shiftWeek(weekStart, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 active:scale-95 transition-all"
            aria-label="Następny tydzień"
          >
            <IconChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 mb-3">
          {WEEK_DAYS.map((label, i) => {
            const on = days.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  on
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                aria-pressed={on}
                title={on ? 'Kliknij, by pominąć ten dzień' : 'Kliknij, by uwzględnić ten dzień'}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || days.length === 0}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-2 rounded-xl hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all"
        >
          <IconCalendar className="w-4 h-4" />
          {generating ? 'Generowanie...' : `Generuj z planu (${rangeLabel})`}
        </button>
        {genMessage && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">{genMessage}</p>
        )}
      </div>

      {coveredByList > 0 && (
        <p className="-mt-3 mb-4 text-xs text-center text-gray-400 dark:text-gray-500">
          Na liście masz już {coveredByList} z potrzebnych pozycji.
        </p>
      )}

      {/* Czego brakuje — planer minus spiżarnia minus lista, zaokrąglone do opakowań */}
      {missing.length > 0 && (
        <div className="mb-5 rounded-2xl border border-primary-100 dark:border-primary-500/20 bg-primary-50/50 dark:bg-primary-500/5 overflow-hidden">
          <button
            onClick={() => setShowNeeds((s) => !s)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300"
          >
            <span>Czego brakuje ({rangeLabel}) — {missing.length}</span>
            <svg className={`w-4 h-4 ml-auto transition-transform ${showNeeds ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* Nazwa produktu i rachunek „potrzeba → kup" to dwie osobne
              informacje, więc dostają osobne wiersze. Wciśnięte obok siebie
              nazwa zostawała z kilkoma pikselami i łamała się po literze. */}
          {showNeeds && (
            <ul className="px-4 pb-3 divide-y divide-primary-100/70 dark:divide-primary-500/10">
              {missing.map((n, i) => (
                <li key={i} className="py-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100 break-words">{n.name}</p>
                  <p className="text-gray-500 dark:text-gray-400 tabular-nums mt-0.5">
                    potrzeba {n.required} {n.unit} · masz {n.inStock}
                    {n.onList > 0 ? ` · na liście ${n.onList}` : ''} →{' '}
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      kup {n.toBuy} {n.unit}
                    </span>
                    {n.packages ? ` (${n.packages} opak.)` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Ilość jest opcjonalna, ale to ona sprawia, że odhaczenie zasila spiżarnię —
          dlatego stoi obok nazwy, a nie w osobnym kroku. */}
      <form onSubmit={handleAdd} className="mb-6 space-y-2">
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Dodaj produkt..."
            className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!newItem.trim()}
            className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-primary-600 disabled:opacity-50 shrink-0"
          >
            Dodaj
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            placeholder="ile"
            aria-label="Ilość (opcjonalnie)"
            className="w-20 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value as BaseUnit)}
            aria-label="Jednostka"
            className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {BASE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
          </select>
          <span className="text-xs text-gray-400 dark:text-gray-500 min-w-0">
            Z ilością pozycja wpadnie po zakupie do spiżarni.
          </span>
        </div>
      </form>

      {pantryNote && (
        <p className="-mt-4 mb-5 text-xs text-center text-gray-500 dark:text-gray-400">{pantryNote}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <IconCart className="w-10 h-10 mx-auto mb-3 opacity-60" />
          <p>Lista jest pusta.</p>
          <p className="text-sm mt-1">Dodaj produkty ręcznie lub wygeneruj z tygodniowego planu.</p>
        </div>
      ) : (
        <>
          {unchecked.length > 0 && (
            <ul className="space-y-2 mb-6">
              {unchecked.map((item) => (
                <ShoppingRow key={item.id} item={item} onToggle={handleToggle} onRemove={handleRemove} />
              ))}
            </ul>
          )}

          {checked.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Kupione ({checked.length})</p>
              <ul className="space-y-2">
                {checked.map((item) => (
                  <ShoppingRow key={item.id} item={item} onToggle={handleToggle} onRemove={handleRemove} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem, isChecked: boolean) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        item.isChecked
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(item, !item.isChecked)}
        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
          item.isChecked
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
        }`}
        aria-label={item.isChecked ? 'Odznacz' : 'Zaznacz'}
      >
        {item.isChecked && <IconCheck className="w-3 h-3" />}
      </button>

      {/* Nazwa zawija się zamiast wypychać ilość poza kartę — na liście zakupów
          liczy się właśnie ilość obok nazwy. */}
      <span className={`flex-1 min-w-0 text-sm break-words ${item.isChecked ? 'line-through text-gray-400' : ''}`}>
        {item.name}
      </span>

      {(item.quantity || item.unit) && (
        <span className="text-sm text-gray-400 tabular-nums shrink-0">{item.quantity} {item.unit}</span>
      )}

      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 p-2 min-w-10 min-h-10 flex items-center justify-center rounded-md text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
        aria-label="Usuń produkt"
      >
        <IconClose className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function itemLabel(item: ShoppingItem): string {
  const qty = item.quantity ? ` – ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '';
  return `${item.name}${qty}`;
}

// #23 — export the meal shopping list into a concrete todo list as a single
// shopping-kind task whose checklist items are the (unchecked) products. Uses
// the existing todo API, so there's no backend coupling between the modules.
function ExportModal({ items, onClose }: { items: ShoppingItem[]; onClose: () => void }) {
  const [lists, setLists] = useState<TodoList[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [onlyUnchecked, setOnlyUnchecked] = useState(true);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getLists()
      .then((ls) => {
        // Only lists the user can write to.
        const writable = ls.filter((l) => l.role !== 'viewer');
        setLists(writable);
        const preferred = writable.find((l) => l.isDefault) ?? writable[0];
        if (preferred) {
          setSelected(preferred.id);
        }
      })
      .catch(() => setError('Nie udało się pobrać list zadań.'));
  }, []);

  const source = onlyUnchecked ? items.filter((i) => !i.isChecked) : items;

  const handleExport = async () => {
    if (!selected || source.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = new Date();
      const dateLabel = `${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const todo = await addTodo({
        text: `Zakupy z posiłków (${dateLabel})`,
        completed: false,
        listId: selected,
        kind: 'shopping',
        // Assign the chosen day, or fall back to the month bucket (Luźne) if none.
        ...(date ? { date } : { month: now.toISOString().slice(0, 7) }),
      });
      const shoppingItems: TodoShoppingItem[] = source.map((it, idx) => ({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${idx}`,
        text: itemLabel(it),
        checked: false,
        order: idx,
      }));
      await updateTodo({ ...todo, kind: 'shopping', items: shoppingItems });
      setDone(true);
    } catch {
      setError('Eksport się nie powiódł. Spróbuj ponownie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold">Eksport do listy zadań</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Zamknij"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {done ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <IconCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Dodano {source.length} pozycji do wybranej listy.</p>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={onlyUnchecked}
                  onChange={(e) => setOnlyUnchecked(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Tylko niekupione ({items.filter((i) => !i.isChecked).length})
              </label>

              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Termin (opcjonalnie)</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mb-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-3 mb-4">Bez terminu trafi do „Luźne".</p>

              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Lista docelowa</p>
              {lists === null ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : lists.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Brak list, do których możesz pisać.</p>
              ) : (
                <ul className="space-y-1.5">
                  {lists.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setSelected(l.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                          selected === l.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="font-medium block truncate">{l.name}</span>
                          <span className="text-xs text-gray-400 block truncate">{l.householdName}</span>
                        </span>
                        {selected === l.id && <IconCheck className="w-4 h-4 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            </>
          )}
        </div>

        {!done && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleExport}
              disabled={busy || !selected || source.length === 0}
              className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all"
            >
              {busy ? 'Eksportowanie...' : `Eksportuj ${source.length} pozycji`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
