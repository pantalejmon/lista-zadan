import { useState, useEffect, useCallback } from 'react';
import {
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  type Recipe,
  type RecipeIngredient,
  type Ingredient,
} from '../../lib/meals';
import { IngredientAutocomplete } from './IngredientAutocomplete';

type Mode =
  | { view: 'list' }
  | { view: 'detail'; id: string }
  | { view: 'form'; id?: string };

export function RecipesView() {
  const [mode, setMode] = useState<Mode>({ view: 'list' });

  if (mode.view === 'form') {
    return (
      <RecipeForm
        id={mode.id}
        onDone={(id) => setMode(id ? { view: 'detail', id } : { view: 'list' })}
        onCancel={() => setMode(mode.id ? { view: 'detail', id: mode.id } : { view: 'list' })}
      />
    );
  }

  if (mode.view === 'detail') {
    return (
      <RecipeDetail
        id={mode.id}
        onBack={() => setMode({ view: 'list' })}
        onEdit={() => setMode({ view: 'form', id: mode.id })}
      />
    );
  }

  return (
    <RecipeList
      onOpen={(id) => setMode({ view: 'detail', id })}
      onNew={() => setMode({ view: 'form' })}
    />
  );
}

function RecipeList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setRecipes(await getRecipes());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteRecipe(id);
    load();
  };

  const q = search.trim().toLowerCase();
  const displayed = q
    ? recipes.filter((r) => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    : recipes;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Przepisy</h1>
        <button
          onClick={onNew}
          className="bg-primary-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-600 active:scale-95 transition-all"
        >
          + Dodaj
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Szukaj przepisu..."
        className="w-full mb-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-3">🍽️</div>
          <p>{recipes.length === 0 ? 'Nie masz jeszcze przepisów.' : 'Brak wyników.'}</p>
          {recipes.length === 0 && <p className="text-sm mt-1">Dodaj pierwszy przepis, aby zaplanować posiłki.</p>}
        </div>
      ) : (
        <ul className="space-y-3">
          {displayed.map((recipe) => (
            <li
              key={recipe.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start justify-between gap-3"
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
                </p>
              </button>
              <div className="flex gap-3 shrink-0 text-gray-400">
                <button onClick={() => onOpen(recipe.id)} className="hover:text-gray-700 dark:hover:text-gray-200" title="Otwórz">✏️</button>
                <button onClick={() => handleDelete(recipe.id)} className="hover:text-red-600" title="Usuń">🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeDetail({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: () => void }) {
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);

  useEffect(() => {
    getRecipe(id).then((r) => setRecipe(r ?? null));
  }, [id]);

  if (recipe === undefined) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Ładowanie...</div>;
  }
  if (recipe === null) {
    return <div className="text-center py-16 text-gray-400">Przepis nie znaleziony.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">← Wróć</button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{recipe.title}</h1>
        <button onClick={onEdit} className="shrink-0 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">✏️ Edytuj</button>
      </div>

      {recipe.description && <p className="text-gray-600 dark:text-gray-300 mb-6">{recipe.description}</p>}

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
  ingredient: Ingredient | null;
  quantity: string;
  unit: string;
}

function RecipeForm({ id, onDone, onCancel }: { id?: string; onDone: (id?: string) => void; onCancel: () => void }) {
  const isEdit = Boolean(id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([{ ingredient: null, quantity: '', unit: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    getRecipe(id).then((existing) => {
      if (!existing) {
        return;
      }
      setTitle(existing.title);
      setDescription(existing.description ?? '');
      setInstructions(existing.instructions);
      if (existing.recipeIngredients.length > 0) {
        setRows(existing.recipeIngredients.map((ri) => ({
          ingredient: { id: ri.ingredientId, name: ri.name },
          quantity: ri.quantity ? String(ri.quantity) : '',
          unit: ri.unit,
        })));
      }
    });
  }, [id]);

  const addRow = () => setRows([...rows, { ingredient: null, quantity: '', unit: '' }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<IngredientRow>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    setSaving(true);
    const recipeIngredients: RecipeIngredient[] = rows
      .filter((r) => r.ingredient)
      .map((r) => ({
        ingredientId: r.ingredient!.id,
        name: r.ingredient!.name,
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit.trim(),
      }));
    const input = { title, description, instructions, recipeIngredients };
    const saved = isEdit ? await updateRecipe(id!, input) : await createRecipe(input);
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
            <button onClick={addRow} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">+ Dodaj wiersz</button>
          </div>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <IngredientAutocomplete
                    value={row.ingredient}
                    onChange={(ing) => updateRow(i, { ingredient: ing, unit: ing.defaultUnit ?? row.unit })}
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
                  <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500">✕</button>
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
