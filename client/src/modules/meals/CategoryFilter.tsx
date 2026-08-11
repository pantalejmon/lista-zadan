import { UNCATEGORISED } from './meals';

// Wyszukiwarka + chipy kategorii. Wspólne dla Produktów i Przepisów.
//
// Chipy **zawijają się** do kolejnych wierszy zamiast przewijać w bok: kategorii
// jest kilka-kilkanaście i wszystkie mają być widoczne od razu. Przewijany rząd
// chował je za krawędzią, więc filtr wyglądał na krótszy, niż jest.
// `active === null` znaczy „Wszystkie".
export function CategoryFilter({
  search,
  onSearch,
  placeholder,
  categories,
  active,
  onSelect,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  categories: string[];
  active: string | null;
  onSelect: (category: string | null) => void;
}) {
  return (
    <div className="mb-4 space-y-2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Wszystkie" active={active === null} onClick={() => onSelect(null)} />
          {categories.map((c) => (
            <Chip
              key={c}
              label={c === UNCATEGORISED ? 'Bez kat.' : c}
              active={active === c}
              onClick={() => onSelect(active === c ? null : c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}
