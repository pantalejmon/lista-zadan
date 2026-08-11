import { useState, useEffect, useCallback } from 'react';
import type { MealStorage, PantryItem, Product } from './meals';
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

  // Dodatnia delta dokłada opakowanie, ujemna je zdejmuje — serwer podłogowuje do zera.
  const handleAdjustPackage = async (productId: string, delta: number) => {
    await storage.adjustPantryStock(productId, delta);
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
              onAddPackage={() => it.packageSize && handleAdjustPackage(it.productId, it.packageSize)}
              onRemovePackage={() => it.packageSize && handleAdjustPackage(it.productId, -it.packageSize)}
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
  onRemovePackage,
  onRemove,
}: {
  item: PantryItem;
  onSet: (quantity: number) => void;
  onAddPackage: () => void;
  onRemovePackage: () => void;
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

  // Na telefonie nazwa dostaje **całą szerokość** i własny wiersz, a kontrolki
  // schodzą pod nią. Wciśnięte w jeden rząd zabierały jej tyle miejsca, że
  // „Mleko 3,2%" wyświetlało się jako „Ml…" — przy pustym ekranie pod spodem.
  // Od `sm` wzwyż mieści się wszystko obok siebie, więc wracamy do jednego rzędu.
  return (
    <li className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 sm:flex-1">
        <p className="font-medium break-words sm:truncate">{item.name}</p>
        {item.packageSize ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">opak. {item.packageSize} {item.baseUnit}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { commit(); } }}
          aria-label={`Stan: ${item.name}`}
          className="w-24 sm:w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-400 shrink-0">{item.baseUnit}</span>
        {/* Opakowanie chodzi w obie strony: jedno się zepsuło albo zużyło poza
            posiłkiem, więc musi dać się je zdjąć tak samo łatwo, jak dołożyć (#107). */}
        {item.packageSize ? (
          <span className="flex items-center rounded-lg bg-primary-50 dark:bg-primary-500/10 shrink-0">
            <button
              onClick={onRemovePackage}
              disabled={item.quantity <= 0}
              className="min-w-10 min-h-10 flex items-center justify-center rounded-l-lg text-primary-600 dark:text-primary-400 text-base font-semibold hover:bg-primary-100 dark:hover:bg-primary-500/20 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title={`Zdejmij jedno opakowanie (${item.packageSize} ${item.baseUnit})`}
              aria-label={`Zdejmij opakowanie: ${item.name}`}
            >
              −
            </button>
            <span className="text-[10px] text-primary-600/70 dark:text-primary-400/70 px-0.5 select-none">opak.</span>
            <button
              onClick={onAddPackage}
              className="min-w-10 min-h-10 flex items-center justify-center rounded-r-lg text-primary-600 dark:text-primary-400 text-base font-semibold hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
              title={`Dodaj jedno opakowanie (${item.packageSize} ${item.baseUnit})`}
              aria-label={`Dodaj opakowanie: ${item.name}`}
            >
              +
            </button>
          </span>
        ) : null}
        {/* Kosz na koniec rzędu — na telefonie odsunięty na prawą krawędź,
            żeby nie sąsiadował z „+opak." i nie łapało się go przez pomyłkę. */}
        <span className="flex-1 sm:hidden" />
        <button
          onClick={onRemove}
          className="p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all shrink-0"
          aria-label={`Usuń ze spiżarni: ${item.name}`}
        >
          <IconTrash className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}
