import { useState, useEffect, useCallback } from 'react';
import { getMonday, type MealStorage, type ShoppingItem, type NeedItem } from '../../lib/meals';
import { IconCalendar, IconCart, IconClose, IconCheck } from './icons';

export function ShoppingView({ storage, liveKey = 0 }: { storage: MealStorage; liveKey?: number }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showNeeds, setShowNeeds] = useState(false);

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
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold">Lista zakupów</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all shrink-0"
        >
          <IconCalendar className="w-4 h-4" />
          {generating ? 'Generowanie...' : 'Generuj z planu'}
        </button>
      </div>

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
