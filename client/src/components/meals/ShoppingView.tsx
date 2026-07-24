import { useState, useEffect, useCallback } from 'react';
import { getMonday, type MealStorage, type ShoppingItem, type NeedItem } from '../../lib/meals';
import { getLists, addTodo, updateTodo } from '../../lib/api';
import type { TodoList, ShoppingItem as TodoShoppingItem } from '../../lib/types';
import { IconCalendar, IconCart, IconClose, IconCheck } from './icons';

export function ShoppingView({ storage, liveKey = 0 }: { storage: MealStorage; liveKey?: number }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showNeeds, setShowNeeds] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    const [shopping, weekNeeds] = await Promise.all([
      storage.getShopping(),
      storage.computeNeeds(getMonday(new Date())),
    ]);
    setItems(shopping);
    setNeeds(weekNeeds);
    setLoading(false);
  }, [storage]);

  useEffect(() => { load(); }, [load, liveKey]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) {
      return;
    }
    await storage.addShoppingItem(name);
    setNewItem('');
    load();
  };

  const handleToggle = async (id: string, isChecked: boolean) => {
    await storage.toggleShoppingItem(id, isChecked);
    load();
  };

  const handleRemove = async (id: string) => {
    await storage.removeShoppingItem(id);
    load();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const count = await storage.generateShoppingFromPlan(getMonday(new Date()));
    setGenerating(false);
    if (count === 0) {
      alert('Brak przepisów w planie na ten tydzień. Dodaj posiłki w Planerze.');
    }
    load();
  };

  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Lista zakupów</h1>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm border border-primary-500 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 active:scale-95 transition-all shrink-0"
            >
              <IconCart className="w-4 h-4" />
              Do listy zadań
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all shrink-0"
          >
            <IconCalendar className="w-4 h-4" />
            {generating ? 'Generowanie...' : 'Generuj z planu'}
          </button>
        </div>
      </div>

      {exportOpen && (
        <ExportModal items={items} onClose={() => setExportOpen(false)} />
      )}

      {/* Czego brakuje — planer minus spiżarnia, zaokrąglone do opakowań */}
      {needs.some((n) => n.shortfall > 0) && (
        <div className="mb-5 rounded-2xl border border-primary-100 dark:border-primary-500/20 bg-primary-50/50 dark:bg-primary-500/5 overflow-hidden">
          <button
            onClick={() => setShowNeeds((s) => !s)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300"
          >
            <span>Czego brakuje w tym tygodniu ({needs.filter((n) => n.shortfall > 0).length})</span>
            <svg className={`w-4 h-4 ml-auto transition-transform ${showNeeds ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showNeeds && (
            <ul className="px-4 pb-3 space-y-1.5">
              {needs.filter((n) => n.shortfall > 0).map((n, i) => (
                <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{n.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                    potrzeba {n.required} {n.unit} · masz {n.inStock} → <span className="text-primary-600 dark:text-primary-400 font-medium">kup {n.toBuy} {n.unit}</span>
                    {n.packages ? ` (${n.packages} opak.)` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
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
      </form>

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
  onToggle: (id: string, isChecked: boolean) => void;
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
        onClick={() => onToggle(item.id, !item.isChecked)}
        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
          item.isChecked
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
        }`}
        aria-label={item.isChecked ? 'Odznacz' : 'Zaznacz'}
      >
        {item.isChecked && <IconCheck className="w-3 h-3" />}
      </button>

      <span className={`flex-1 text-sm ${item.isChecked ? 'line-through text-gray-400' : ''}`}>{item.name}</span>

      {(item.quantity || item.unit) && (
        <span className="text-sm text-gray-400 tabular-nums">{item.quantity} {item.unit}</span>
      )}

      <button
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0 p-1 rounded-md text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
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
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                  className="w-4 h-4 rounded accent-primary-500"
                />
                Tylko niekupione ({items.filter((i) => !i.isChecked).length})
              </label>

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
