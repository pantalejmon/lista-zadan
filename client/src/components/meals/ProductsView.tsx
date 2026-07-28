import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BASE_UNITS,
  PRODUCT_CATEGORIES,
  UNCATEGORISED,
  presentCategories,
  groupByCategory,
  nutritionBasisLabel,
  type MealStorage,
  type Product,
  type ProductInput,
  type BaseUnit,
} from '../../lib/meals';
import { CategoryFilter } from './CategoryFilter';
import { IconPlus, IconTrash, IconPencil, IconClose } from './icons';

const CATEGORIES = PRODUCT_CATEGORIES;

export function ProductsView({ storage, liveKey = 0 }: { storage: MealStorage; liveKey?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    setProducts(await storage.getProducts());
    setLoading(false);
  }, [storage]);

  useEffect(() => { load(); }, [load, liveKey]);

  const categories = useMemo(() => presentCategories(products, (p) => p.category, CATEGORIES), [products]);
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const matchesText = !q || p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
      const matchesCat = !activeCat || (p.category?.trim() || UNCATEGORISED) === activeCat;
      return matchesText && matchesCat;
    });
    return groupByCategory(filtered, (p) => p.category, CATEGORIES);
  }, [products, search, activeCat]);
  const visibleCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  const handleSave = async (input: ProductInput, id?: string) => {
    if (id) {
      await storage.updateProduct(id, input);
    } else {
      await storage.createProduct(input);
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await storage.deleteProduct(id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Produkty</h1>
        {editing === null && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 bg-primary-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-600 active:scale-95 transition-all"
          >
            <IconPlus className="w-4 h-4" />
            Dodaj
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Słownik produktów z jednostką i rozmiarem opakowania — podstawa spiżarni i inteligentnych zakupów.
      </p>

      {editing === 'new' && (
        <ProductForm onSave={(input) => handleSave(input)} onCancel={() => setEditing(null)} />
      )}

      {!loading && products.length > 0 && (
        <CategoryFilter
          search={search}
          onSearch={setSearch}
          placeholder="Szukaj produktu..."
          categories={categories}
          active={activeCat}
          onSelect={setActiveCat}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : products.length === 0 && editing === null ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>Brak produktów.</p>
          <p className="text-sm mt-1">Dodaj produkty lub pojawią się automatycznie ze składników przepisów.</p>
        </div>
      ) : visibleCount === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p>Brak wyników.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 px-1">
                {group.category} <span className="text-gray-300 dark:text-gray-600">· {group.items.length}</span>
              </h2>
              <ul className="space-y-2">
                {group.items.map((p) =>
                  editing !== null && editing !== 'new' && editing.id === p.id ? (
                    <li key={p.id}>
                      <ProductForm product={p} onSave={(input) => handleSave(input, p.id)} onCancel={() => setEditing(null)} />
                    </li>
                  ) : (
                    <li
                      key={p.id}
                      className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          jedn. {p.baseUnit}
                          {p.packageSize ? ` · opak. ${p.packageSize} ${p.baseUnit}` : ''}
                          {!p.trackInPantry ? ' · nie śledzone' : ''}
                          {p.nutrition
                            ? ` · ${p.nutrition.kcal} kcal ${nutritionBasisLabel(p.baseUnit)}`
                            : ' · bez makro'}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditing(p)}
                        className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 transition-all"
                        aria-label="Edytuj"
                      >
                        <IconPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
                        aria-label="Usuń"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function NutrientInput({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-gray-400 dark:text-gray-500 mb-1">
        {label}
        {optional ? ' · opcj.' : ''}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </label>
  );
}

// Puste pole = „nie wiem", a nie zero — stąd undefined zamiast NaN/0.
function optionalNumber(value: string): number | undefined {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ProductForm({ product, onSave, onCancel }: { product?: Product; onSave: (input: ProductInput) => void; onCancel: () => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [baseUnit, setBaseUnit] = useState<BaseUnit>(product?.baseUnit ?? 'szt');
  const [packageSize, setPackageSize] = useState(product?.packageSize ? String(product.packageSize) : '');
  const [trackInPantry, setTrackInPantry] = useState(product?.trackInPantry ?? true);
  const [kcal, setKcal] = useState(product?.nutrition ? String(product.nutrition.kcal) : '');
  const [protein, setProtein] = useState(product?.nutrition ? String(product.nutrition.protein) : '');
  const [fat, setFat] = useState(product?.nutrition ? String(product.nutrition.fat) : '');
  const [carbs, setCarbs] = useState(product?.nutrition ? String(product.nutrition.carbs) : '');
  const [fiber, setFiber] = useState(product?.nutrition?.fiber !== undefined ? String(product.nutrition.fiber) : '');
  const [salt, setSalt] = useState(product?.nutrition?.salt !== undefined ? String(product.nutrition.salt) : '');
  const [showNutrition, setShowNutrition] = useState(Boolean(product?.nutrition));

  // Makro zapisujemy kompletem (kcal + 3 makroskładniki) — z połowy etykiety
  // wyszłoby zaniżone makro przepisu, więc lepiej nie zapisać nic.
  const macros = [kcal, protein, fat, carbs];
  const macrosComplete = macros.every((v) => optionalNumber(v) !== undefined);
  const macrosTouched = macros.some((v) => v.trim() !== '');
  const macrosIncomplete = macrosTouched && !macrosComplete;

  const submit = () => {
    if (!name.trim() || macrosIncomplete) {
      return;
    }
    onSave({
      name,
      category: category.trim() || undefined,
      baseUnit,
      packageSize: parseFloat(packageSize) || undefined,
      trackInPantry,
      nutrition: macrosComplete
        ? {
          kcal: optionalNumber(kcal) ?? 0,
          protein: optionalNumber(protein) ?? 0,
          fat: optionalNumber(fat) ?? 0,
          carbs: optionalNumber(carbs) ?? 0,
          fiber: optionalNumber(fiber),
          salt: optionalNumber(salt),
        }
        : undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-3 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa produktu (np. Ryż)"
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="flex gap-2">
        <input
          list="product-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Kategoria"
          className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <datalist id="product-categories">
          {CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>
        <select
          value={baseUnit}
          onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {BASE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={packageSize}
          onChange={(e) => setPackageSize(e.target.value)}
          placeholder="Rozmiar opakowania"
          className="w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-400">{baseUnit} / opak.</span>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={trackInPantry}
          onChange={(e) => setTrackInPantry(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        Śledź w spiżarni
      </label>

      {/* Wartości odżywcze — zwinięte, dopóki produkt ich nie ma */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <button
          type="button"
          onClick={() => setShowNutrition((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showNutrition ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Wartości odżywcze
          <span className="text-xs font-normal text-gray-400">({nutritionBasisLabel(baseUnit)})</span>
        </button>

        {showNutrition && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <NutrientInput label="Energia (kcal)" value={kcal} onChange={setKcal} />
              <NutrientInput label="Białko (g)" value={protein} onChange={setProtein} />
              <NutrientInput label="Tłuszcz (g)" value={fat} onChange={setFat} />
              <NutrientInput label="Węglowodany (g)" value={carbs} onChange={setCarbs} />
              <NutrientInput label="Błonnik (g)" value={fiber} onChange={setFiber} optional />
              <NutrientInput label="Sól (g)" value={salt} onChange={setSalt} optional />
            </div>
            {macrosIncomplete && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Uzupełnij komplet: energia, białko, tłuszcz i węglowodany. Z połowy etykiety wyszłoby zaniżone makro przepisu.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={!name.trim() || macrosIncomplete}
          className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          Zapisz
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Anuluj"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
