import { useState, useRef, useEffect } from 'react';
import { BASE_UNITS, type BaseUnit, type MealStorage, type Product } from './meals';

interface Props {
  storage: MealStorage;
  value?: Product | null;
  onChange: (product: Product) => void;
  placeholder?: string;
}

// Picks a product from the household dictionary (or quick-creates one by name).
export function IngredientAutocomplete({ storage, value, onChange, placeholder = 'Szukaj produktu...' }: Props) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  // Nazwa produktu zakładanego „w locie". Zanim powstał ten formularz, każdy taki
  // produkt dostawał na sztywno `szt` — a wtedy przepis w gramach się z nim nie
  // schodził, zaokrąglanie do opakowań nie działało i spiżarnia liczyła sztuki
  // mleka (#106).
  const [creating, setCreating] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const runSearch = (q: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setResults(await storage.searchProducts(q));
      setOpen(true);
    }, 150);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    runSearch(e.target.value);
  };

  const handleSelect = (product: Product) => {
    onChange(product);
    setQuery(product.name);
    setOpen(false);
  };

  const handleCreated = async (name: string, baseUnit: BaseUnit, packageSize?: number) => {
    const product = await storage.createProduct({ name, baseUnit, packageSize, trackInPantry: true });
    setCreating(null);
    handleSelect(product);
  };

  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => runSearch(query)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {creating !== null && (
        <NewProductForm
          name={creating}
          onCancel={() => setCreating(null)}
          onCreate={handleCreated}
        />
      )}
      {creating === null && open && (results.length > 0 || query.trim()) && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
          {results.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => handleSelect(p)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-500/10 flex items-center justify-between"
            >
              <span>{p.name}</span>
              <span className="text-gray-400 text-xs">{p.baseUnit}{p.packageSize ? ` · opak. ${p.packageSize}` : ''}</span>
            </li>
          ))}
          {!exactMatch && query.trim() && (
            <li
              onMouseDown={() => { setCreating(query.trim()); setOpen(false); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-t border-gray-100 dark:border-gray-700"
            >
              + Dodaj produkt „{query.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Minimum, bez którego produkt jest bezużyteczny: jednostka (bo w niej liczy się
// spiżarnia i zakupy) i opcjonalny rozmiar opakowania (bo bez niego nie ma
// zaokrąglania „kup całe opakowanie"). Resztę — kategorię, makro — uzupełnia się
// w zakładce Produkty.
function NewProductForm({
  name,
  onCreate,
  onCancel,
}: {
  name: string;
  onCreate: (name: string, baseUnit: BaseUnit, packageSize?: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [unit, setUnit] = useState<BaseUnit>('szt');
  const [packageSize, setPackageSize] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const size = parseFloat(packageSize.replace(',', '.'));
    await onCreate(name, unit, Number.isFinite(size) && size > 0 ? size : undefined);
    setBusy(false);
  };

  return (
    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-primary-300 dark:border-primary-500/40 rounded-lg shadow-lg p-3 space-y-3">
      <p className="text-sm font-medium break-words">Nowy produkt: „{name}”</p>

      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">W czym go liczymy?</p>
        <div className="flex gap-1.5">
          {BASE_UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => setUnit(u.value)}
              title={u.label}
              aria-pressed={unit === u.value}
              className={`flex-1 min-h-10 rounded-lg text-sm font-medium transition-colors ${
                unit === u.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {u.value}
            </button>
          ))}
        </div>
      </div>

      <div>
        {/* Bez rozmiaru opakowania zakupy nie umieją powiedzieć „kup całe opakowanie",
            więc pytamy od razu — ale nie zmuszamy. */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Ile {unit} ma opakowanie? (opcjonalnie)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={packageSize}
            onChange={(e) => setPackageSize(e.target.value)}
            placeholder="np. 1000"
            aria-label="Rozmiar opakowania (opcjonalnie)"
            className="w-28 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-xs text-gray-400 shrink-0">{unit}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex-1 bg-primary-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Dodaję…' : 'Dodaj produkt'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
