import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RECIPE_CATEGORIES,
  UNCATEGORISED,
  presentCategories,
  groupByCategory,
  type MealStorage,
  type Recipe,
  type RecipeIngredient,
  type Product,
} from './meals';
import { CategoryFilter } from './CategoryFilter';
import { NutritionSummary } from './NutritionSummary';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import { IconPlus, IconTrash, IconPencil, IconBack, IconClose, IconBook } from './icons';

type Mode =
  | { view: 'list' }
  | { view: 'detail'; id: string }
  | { view: 'form'; id?: string };

export function RecipesView({ storage, liveKey = 0 }: { storage: MealStorage; liveKey?: number }) {
  const [mode, setMode] = useState<Mode>({ view: 'list' });

  if (mode.view === 'form') {
    return (
      <RecipeForm
        storage={storage}
        id={mode.id}
        onDone={(id) => setMode(id ? { view: 'detail', id } : { view: 'list' })}
        onCancel={() => setMode(mode.id ? { view: 'detail', id: mode.id } : { view: 'list' })}
      />
    );
  }

  if (mode.view === 'detail') {
    return (
      <RecipeDetail
        storage={storage}
        id={mode.id}
        onBack={() => setMode({ view: 'list' })}
        onEdit={() => setMode({ view: 'form', id: mode.id })}
      />
    );
  }

  return (
    <RecipeList
      storage={storage}
      liveKey={liveKey}
      onOpen={(id) => setMode({ view: 'detail', id })}
      onNew={() => setMode({ view: 'form' })}
    />
  );
}

function RecipeList({ storage, liveKey, onOpen, onNew }: { storage: MealStorage; liveKey: number; onOpen: (id: string) => void; onNew: () => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRecipes(await storage.getRecipes());
    setLoading(false);
  }, [storage]);

  useEffect(() => { load(); }, [load, liveKey]);

  const handleDelete = async (id: string) => {
    await storage.deleteRecipe(id);
    load();
  };

  const categories = useMemo(() => presentCategories(recipes, (r) => r.category, RECIPE_CATEGORIES), [recipes]);
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = recipes.filter((r) => {
      const matchesText =
        !q || r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q);
      const matchesCat = !activeCat || (r.category?.trim() || UNCATEGORISED) === activeCat;
      return matchesText && matchesCat;
    });
    return groupByCategory(filtered, (r) => r.category, RECIPE_CATEGORIES);
  }, [recipes, search, activeCat]);
  const visibleCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Przepisy</h1>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 bg-primary-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-600 active:scale-95 transition-all"
        >
          <IconPlus className="w-4 h-4" />
          Dodaj
        </button>
      </div>

      {!loading && recipes.length > 0 && (
        <CategoryFilter
          search={search}
          onSearch={setSearch}
          placeholder="Szukaj przepisu..."
          categories={categories}
          active={activeCat}
          onSelect={setActiveCat}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <IconBook className="w-10 h-10 mx-auto mb-3 opacity-60" />
          <p>Nie masz jeszcze przepisów.</p>
          <p className="text-sm mt-1">Dodaj pierwszy przepis, aby zaplanować posiłki.</p>
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
              <ul className="space-y-3">
                {group.items.map((recipe) => (
                  <li
                    key={recipe.id}
                    className="group bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all p-4 flex items-start justify-between gap-3"
                  >
                    <button onClick={() => onOpen(recipe.id)} className="flex-1 min-w-0 text-left">
                      <span className="font-semibold hover:text-primary-600 dark:hover:text-primary-400 block truncate">
                        {recipe.title}
                      </span>
                      {recipe.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{recipe.description}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {recipe.recipeIngredients.length} składników
                        {recipe.servings > 1 ? ` · ${recipe.servings} porcje` : ''}
                        {recipe.nutrition && recipe.nutrition.coverage > 0
                          ? ` · ${recipe.nutrition.perServing.kcal} kcal/porcja`
                          : ''}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onOpen(recipe.id)}
                        className="p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 transition-all"
                        aria-label="Edytuj"
                      >
                        <IconPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        className="p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
                        aria-label="Usuń"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeDetail({ storage, id, onBack, onEdit }: { storage: MealStorage; id: string; onBack: () => void; onEdit: () => void }) {
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);

  useEffect(() => {
    storage.getRecipe(id).then((r) => setRecipe(r ?? null));
  }, [storage, id]);

  if (recipe === undefined) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Ładowanie...</div>;
  }
  if (recipe === null) {
    return <div className="text-center py-16 text-gray-400">Przepis nie znaleziony.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
        <IconBack className="w-4 h-4" /> Wróć
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{recipe.title}</h1>
          {recipe.category && (
            <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              {recipe.category}
            </span>
          )}
        </div>
        <button onClick={onEdit} className="shrink-0 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
          <IconPencil className="w-4 h-4" /> Edytuj
        </button>
      </div>

      {recipe.description && <p className="text-gray-600 dark:text-gray-300 mb-6">{recipe.description}</p>}

      {recipe.nutrition && (
        <section className="mb-6">
          <NutritionSummary nutrition={recipe.nutrition} servings={recipe.servings} />
        </section>
      )}

      {recipe.recipeIngredients.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Składniki</h2>
          <ul className="bg-gray-50 dark:bg-gray-900 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
            {recipe.recipeIngredients.map((ri, i) => (
              <li key={i} className="px-4 py-2.5 flex justify-between text-sm">
                <span>{ri.name}</span>
                <span className="text-gray-500 dark:text-gray-400">{ri.quantity || ''} {ri.unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">Instrukcje</h2>
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{recipe.instructions}</div>
      </section>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
        dodano {new Date(recipe.createdAt).toLocaleDateString('pl-PL')}
      </p>
    </div>
  );
}

interface IngredientRow {
  product: Product | null;
  quantity: string;
  unit: string;
}

function RecipeForm({ storage, id, onDone, onCancel }: { storage: MealStorage; id?: string; onDone: (id?: string) => void; onCancel: () => void }) {
  const isEdit = Boolean(id);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [servings, setServings] = useState('1');
  const [rows, setRows] = useState<IngredientRow[]>([{ product: null, quantity: '', unit: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    storage.getRecipe(id).then((existing) => {
      if (!existing) {
        return;
      }
      setTitle(existing.title);
      setCategory(existing.category ?? '');
      setDescription(existing.description ?? '');
      setInstructions(existing.instructions);
      setServings(String(existing.servings ?? 1));
      if (existing.recipeIngredients.length > 0) {
        setRows(existing.recipeIngredients.map((ri) => ({
          product: { id: ri.ingredientId, name: ri.name, baseUnit: 'szt', trackInPantry: true } as Product,
          quantity: ri.quantity ? String(ri.quantity) : '',
          unit: ri.unit,
        })));
      }
    });
  }, [storage, id]);

  const addRow = () => setRows([...rows, { product: null, quantity: '', unit: '' }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<IngredientRow>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    setSaving(true);
    const recipeIngredients: RecipeIngredient[] = rows
      .filter((r) => r.product)
      .map((r) => ({
        ingredientId: r.product!.id,
        name: r.product!.name,
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit.trim(),
      }));
    const input = {
      title,
      category: category.trim() || undefined,
      description,
      instructions,
      recipeIngredients,
      servings: Math.max(1, Math.round(parseFloat(servings) || 1)),
    };
    const saved = isEdit ? await storage.updateRecipe(id!, input) : await storage.createRecipe(input);
    setSaving(false);
    onDone(saved.id);
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edytuj przepis' : 'Nowy przepis'}</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="recipe-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwa *</label>
          <input
            id="recipe-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="recipe-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategoria</label>
          <input
            id="recipe-category"
            list="recipe-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="np. Śniadanie, Zupa, Deser"
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <datalist id="recipe-categories">
            {RECIPE_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <label htmlFor="recipe-servings" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Liczba porcji
          </label>
          <input
            id="recipe-servings"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-28 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Dzielnik dla wartości odżywczych „na porcję".
          </p>
        </div>

        <div>
          <label htmlFor="recipe-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opis</label>
          <textarea
            id="recipe-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <div>
          <label htmlFor="recipe-instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instrukcje *</label>
          <textarea
            id="recipe-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={6}
            placeholder="Opisz kroki przygotowania..."
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Składniki</label>
            <button onClick={addRow} className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
              <IconPlus className="w-3.5 h-3.5" /> Dodaj wiersz
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <IngredientAutocomplete
                    storage={storage}
                    value={row.product}
                    onChange={(p) => updateRow(i, { product: p, unit: row.unit || p.baseUnit })}
                  />
                </div>
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, { quantity: e.target.value })}
                  placeholder="Ilość"
                  className="w-20 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={row.unit}
                  onChange={(e) => updateRow(i, { unit: e.target.value })}
                  placeholder="Jedn."
                  className="w-16 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
                    aria-label="Usuń wiersz"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={handleSave}
          disabled={!title || !instructions || saving}
          className="flex-1 bg-primary-500 text-white py-2.5 rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
