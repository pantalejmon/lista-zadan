import { useState, useEffect, useCallback } from 'react';
import type { MealStorage, PantryItem, Product } from '../../lib/meals';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import { IconPlus, IconTrash, IconClose } from './icons';

export function PantryView({ storage, liveKey = 0 }: { storage: MealStorage; liveKey?: number }) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addProduct, setAddProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState('');

  const load = useCallback(async () => {
    setItems(await storage.getPantry());
    setLoading(false);
  }, [storage]);

  useEffect(() => { load(); }, [load, liveKey]);

  const handleSetStock = async (productId: string, quantity: number) => {
    await storage.setPantryStock(productId, Math.max(0, quantity));
    load();
  };

  const handleAddPackage = async (productId: string, packageSize: number) => {
    await storage.adjustPantryStock(productId, packageSize);
    load();
  };

  const handleRemove = async (id: string) => {
    await storage.removePantryItem(id);
    load();
  };

  const handleAdd = async () => {
    if (!addProduct) {
      return;
    }
    await storage.setPantryStock(addProduct.id, parseFloat(addQty) || 0);
    setAddProduct(null);
    setAddQty('');
    setAdding(false);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Spiżarnia</h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 bg-primary-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-600 active:scale-95 transition-all"
          >
            <IconPlus className="w-4 h-4" />
            Dodaj
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Co masz w domu. Planer odejmie stan od potrzeb i dokupi tylko braki.
      </p>

      {adding && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-3 space-y-3">
          <IngredientAutocomplete storage={storage} value={addProduct} onChange={setAddProduct} placeholder="Wybierz produkt..." />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              placeholder="Ilość"
              className="w-32 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {addProduct && <span className="text-sm text-gray-400">{addProduct.baseUnit}</span>}
            <div className="flex-1" />
            <button
              onClick={handleAdd}
              disabled={!addProduct}
              className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              Dodaj
            </button>
            <button
              onClick={() => { setAdding(false); setAddProduct(null); setAddQty(''); }}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Anuluj"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 && !adding ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>Spiżarnia jest pusta.</p>
          <p className="text-sm mt-1">Dodaj produkty, które masz w domu.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <PantryRow
              key={it.id}
              item={it}
              onSet={(q) => handleSetStock(it.productId, q)}
              onAddPackage={() => it.packageSize && handleAddPackage(it.productId, it.packageSize)}
              onRemove={() => handleRemove(it.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PantryRow({
  item,
  onSet,
  onAddPackage,
  onRemove,
}: {
  item: PantryItem;
  onSet: (quantity: number) => void;
  onAddPackage: () => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(String(item.quantity));

  useEffect(() => { setQty(String(item.quantity)); }, [item.quantity]);

  const commit = () => {
    const v = parseFloat(qty);
    if (!Number.isNaN(v) && v !== item.quantity) {
      onSet(Math.max(0, v));
    }
  };

  return (
    <li className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        {item.packageSize ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">opak. {item.packageSize} {item.baseUnit}</p>
        ) : null}
      </div>
      <input
        type="number"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(); } }}
        className="w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <span className="text-sm text-gray-400 w-8">{item.baseUnit}</span>
      {item.packageSize ? (
        <button
          onClick={onAddPackage}
          className="text-xs font-medium px-2 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors shrink-0"
          title="Dodaj jedno opakowanie"
        >
          +opak.
        </button>
      ) : null}
      <button
        onClick={onRemove}
        className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all shrink-0"
        aria-label="Usuń"
      >
        <IconTrash className="w-4 h-4" />
      </button>
    </li>
  );
}
