import { useState, useRef, useEffect } from 'react';
import type { MealStorage, Product } from '../../lib/meals';

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

  const handleCreateNew = async () => {
    if (!query.trim()) {
      return;
    }
    handleSelect(await storage.createProduct({ name: query, baseUnit: 'szt', trackInPantry: true }));
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
      {open && (results.length > 0 || query.trim()) && (
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
              onMouseDown={handleCreateNew}
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
