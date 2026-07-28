import type { Nutrition } from '../../lib/meals';

function formatGrams(value: number): string {
  return value.toString().replace('.', ',');
}

// Rozbicie białka na roślinne i zwierzęce. Pokazujemy je tylko wtedy, gdy jest
// co pokazać, i **zawsze** z resztą „bez oznaczenia": suma rozbicia bywa
// mniejsza od całego białka, bo produkty bez określonego pochodzenia nie wpadają
// do żadnej z grup. Doklejenie ich do którejś fałszowałoby obraz.
export function ProteinSplit({ nutrition }: { nutrition: Nutrition }) {
  const plant = nutrition.proteinPlant ?? 0;
  const animal = nutrition.proteinAnimal ?? 0;
  if (plant === 0 && animal === 0) {
    return null;
  }
  const unknown = Math.max(0, Math.round((nutrition.protein - plant - animal) * 10) / 10);
  const total = plant + animal + unknown;

  const parts = [
    { key: 'plant', label: 'roślinne', value: plant, color: 'var(--macro-protein-plant)' },
    { key: 'animal', label: 'zwierzęce', value: animal, color: 'var(--macro-protein-animal)' },
    { key: 'unknown', label: 'bez oznaczenia', value: unknown, color: 'var(--color-gray-300)' },
  ].filter((part) => part.value > 0);

  return (
    <div className="mt-2">
      <div className="flex gap-0.5" aria-hidden="true">
        {parts.map((part, index) => (
          <div
            key={part.key}
            title={`Białko ${part.label}: ${formatGrams(part.value)} g`}
            className={`h-1.5 min-w-[2px] ${index === 0 ? 'rounded-l' : ''} ${
              index === parts.length - 1 ? 'rounded-r' : ''
            }`}
            style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Białko:{' '}
        {parts.map((part, index) => (
          <span key={part.key}>
            {index > 0 ? ' · ' : ''}
            {part.label} <span className="font-medium tabular-nums">{formatGrams(part.value)} g</span>
          </span>
        ))}
      </p>
    </div>
  );
}
