import { useState, useEffect, useCallback } from 'react';
import {
  getShopping,
  addShoppingItem,
  toggleShoppingItem,
  removeShoppingItem,
  generateShoppingFromPlan,
  getMonday,
  type ShoppingItem,
} from '../../lib/meals';

export function ShoppingView() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setItems(await getShopping());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) {
      return;
    }
    await addShoppingItem(name);
    setNewItem('');
    load();
  };

  const handleToggle = async (id: string, isChecked: boolean) => {
    await toggleShoppingItem(id, isChecked);
    load();
  };

  const handleRemove = async (id: string) => {
    await removeShoppingItem(id);
    load();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const count = await generateShoppingFromPlan(getMonday(new Date()));
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
          className="text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all shrink-0"
        >
          {generating ? '⏳' : '📅 Generuj z planu'}
        </button>
      </div>

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
          <div className="text-4xl mb-3">🛒</div>
          <p>Lista jest pusta.</p>
          <p className="text-sm mt-1">Dodaj produkty ręcznie lub wygeneruj z tygodniowego planu.</p>
        </div>
      ) : (
        <>
          {unchecked.length > 0 && (
            <ul className="space-y-2 mb-6">
              {unchecked.map((item) => (
                <li key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleToggle(item.id, true)}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="flex-1 text-sm">{item.name}</span>
                  {(item.quantity || item.unit) && (
                    <span className="text-sm text-gray-400">{item.quantity} {item.unit}</span>
                  )}
                  <button onClick={() => handleRemove(item.id)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                </li>
              ))}
            </ul>
          )}

          {checked.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Kupione ({checked.length})</p>
              <ul className="space-y-2">
                {checked.map((item) => (
                  <li key={item.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggle(item.id, false)}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="flex-1 text-sm text-gray-400 line-through">{item.name}</span>
                    <button onClick={() => handleRemove(item.id)} className="text-gray-200 dark:text-gray-600 hover:text-red-400 text-sm">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
