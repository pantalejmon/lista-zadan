import { UNCATEGORISED } from '../../lib/meals';

// Search box + horizontally-scrollable category chips. Shared by Produkty and
// Przepisy. Mobile-first: full-width search, chips scroll sideways with big tap
// targets, active chip highlighted. `active === null` means "Wszystkie".
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
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
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
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}
