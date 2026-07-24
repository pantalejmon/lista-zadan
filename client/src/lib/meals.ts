import { openDB, type IDBPDatabase } from 'idb';

// --- Domain types (ported from the meal-planner app, adapted to local-first storage) ---

export interface Ingredient {
  id: string;
  name: string;
  defaultUnit?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string; // denormalised for display and shopping aggregation
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
  createdAt: number;
  updatedAt: number;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'BREAKFAST', label: 'Śniadanie' },
  { type: 'LUNCH', label: 'Obiad' },
  { type: 'DINNER', label: 'Kolacja' },
  { type: 'SNACK', label: 'Przekąska' },
];

export const WEEK_DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];

export interface MealEntry {
  id: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  dayOfWeek: number; // 0 = Monday ... 6 = Sunday
  mealType: MealType;
  recipeId: string;
}

export interface PlannerEntry extends MealEntry {
  recipe: Recipe | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  isChecked: boolean;
  sourceRecipeId?: string;
  createdAt: number;
}

export interface RecipeInput {
  title: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
}

// --- IndexedDB ---

const DB_NAME = 'lista-zadan-meals';
const DB_VERSION = 1;
const INGREDIENTS = 'ingredients';
const RECIPES = 'recipes';
const ENTRIES = 'mealEntries';
const SHOPPING = 'shopping';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(INGREDIENTS, { keyPath: 'id' });
        db.createObjectStore(RECIPES, { keyPath: 'id' });
        const entries = db.createObjectStore(ENTRIES, { keyPath: 'id' });
        entries.createIndex('weekStart', 'weekStart', { unique: false });
        db.createObjectStore(SHOPPING, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// --- Week helpers ---

export function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return toDateStr(d);
}

export function weekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Ingredients ---

export async function searchIngredients(query: string): Promise<Ingredient[]> {
  const db = await getDB();
  const all = (await db.getAll(INGREDIENTS)) as Ingredient[];
  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((i) => i.name.toLowerCase().includes(q)) : all;
  return matches.sort((a, b) => a.name.localeCompare(b.name, 'pl')).slice(0, 8);
}

export async function createIngredient(name: string, defaultUnit?: string): Promise<Ingredient> {
  const db = await getDB();
  const all = (await db.getAll(INGREDIENTS)) as Ingredient[];
  const existing = all.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return existing;
  }
  const ingredient: Ingredient = { id: generateId(), name: name.trim(), defaultUnit };
  await db.put(INGREDIENTS, ingredient);
  return ingredient;
}

// --- Recipes ---

export async function getRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  const all = (await db.getAll(RECIPES)) as Recipe[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const db = await getDB();
  return (await db.get(RECIPES, id)) as Recipe | undefined;
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const db = await getDB();
  const now = Date.now();
  const recipe: Recipe = {
    id: generateId(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    instructions: input.instructions.trim(),
    recipeIngredients: input.recipeIngredients,
    createdAt: now,
    updatedAt: now,
  };
  await db.put(RECIPES, recipe);
  return recipe;
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  const db = await getDB();
  const existing = (await db.get(RECIPES, id)) as Recipe | undefined;
  const recipe: Recipe = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    instructions: input.instructions.trim(),
    recipeIngredients: input.recipeIngredients,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await db.put(RECIPES, recipe);
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(RECIPES, id);
  // Drop any planner entries referencing the removed recipe.
  const entries = (await db.getAll(ENTRIES)) as MealEntry[];
  const tx = db.transaction(ENTRIES, 'readwrite');
  for (const entry of entries) {
    if (entry.recipeId === id) {
      await tx.store.delete(entry.id);
    }
  }
  await tx.done;
}

// --- Planner ---

export async function getWeek(weekStart: string): Promise<PlannerEntry[]> {
  const db = await getDB();
  const entries = (await db.getAllFromIndex(ENTRIES, 'weekStart', weekStart)) as MealEntry[];
  const result: PlannerEntry[] = [];
  for (const entry of entries) {
    const recipe = (await db.get(RECIPES, entry.recipeId)) as Recipe | undefined;
    result.push({ ...entry, recipe: recipe ?? null });
  }
  return result;
}

export async function addEntry(
  weekStart: string,
  recipeId: string,
  dayOfWeek: number,
  mealType: MealType,
): Promise<void> {
  const db = await getDB();
  const entries = (await db.getAllFromIndex(ENTRIES, 'weekStart', weekStart)) as MealEntry[];
  const existing = entries.find((e) => e.dayOfWeek === dayOfWeek && e.mealType === mealType);
  const entry: MealEntry = {
    id: existing?.id ?? generateId(),
    weekStart,
    dayOfWeek,
    mealType,
    recipeId,
  };
  await db.put(ENTRIES, entry);
}

export async function removeEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(ENTRIES, id);
}

// --- Shopping ---

export async function getShopping(): Promise<ShoppingItem[]> {
  const db = await getDB();
  const all = (await db.getAll(SHOPPING)) as ShoppingItem[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addShoppingItem(name: string, quantity?: number, unit?: string): Promise<void> {
  const db = await getDB();
  const item: ShoppingItem = {
    id: generateId(),
    name: name.trim(),
    quantity,
    unit,
    isChecked: false,
    createdAt: Date.now(),
  };
  await db.put(SHOPPING, item);
}

export async function toggleShoppingItem(id: string, isChecked: boolean): Promise<void> {
  const db = await getDB();
  const item = (await db.get(SHOPPING, id)) as ShoppingItem | undefined;
  if (item) {
    await db.put(SHOPPING, { ...item, isChecked });
  }
}

export async function removeShoppingItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(SHOPPING, id);
}

// Aggregates every ingredient across the week's planned recipes into one list.
export async function generateShoppingFromPlan(weekStart: string): Promise<number> {
  const entries = await getWeek(weekStart);
  const aggregated = new Map<string, { name: string; quantity: number; unit: string }>();

  for (const entry of entries) {
    if (!entry.recipe) {
      continue;
    }
    for (const ri of entry.recipe.recipeIngredients) {
      const key = `${ri.name.toLowerCase()}__${ri.unit}`;
      const current = aggregated.get(key);
      if (current) {
        current.quantity += ri.quantity;
      } else {
        aggregated.set(key, { name: ri.name, quantity: ri.quantity, unit: ri.unit });
      }
    }
  }

  const db = await getDB();
  const now = Date.now();
  const tx = db.transaction(SHOPPING, 'readwrite');
  let count = 0;
  for (const a of aggregated.values()) {
    const item: ShoppingItem = {
      id: generateId(),
      name: a.name,
      quantity: a.quantity || undefined,
      unit: a.unit || undefined,
      isChecked: false,
      createdAt: now + count,
    };
    await tx.store.put(item);
    count += 1;
  }
  await tx.done;
  return count;
}
