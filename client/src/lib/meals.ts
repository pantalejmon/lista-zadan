import { openDB, type IDBPDatabase } from 'idb';

// --- Domain types (ported from the meal-planner app, adapted to local-first storage) ---

export type BaseUnit = 'g' | 'ml' | 'szt';

export const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: 'g', label: 'g (gramy)' },
  { value: 'ml', label: 'ml (mililitry)' },
  { value: 'szt', label: 'szt (sztuki)' },
];

export interface Product {
  id: string;
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packageSize?: number;
  trackInPantry: boolean;
}

export interface ProductInput {
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packageSize?: number;
  trackInPantry: boolean;
}

export interface PantryItem {
  id: string;
  productId: string;
  name: string;
  baseUnit: string;
  packageSize?: number;
  quantity: number;
}

export interface NeedItem {
  productId: string | null;
  name: string;
  unit: string;
  required: number;
  inStock: number;
  shortfall: number;
  packageSize?: number;
  toBuy: number;
  packages?: number;
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
  category?: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
  createdAt: number;
  updatedAt: number;
}

// Suggested categories (freeform — used for datalist hints, filter chips and
// grouping). Products = grocery aisles; recipes = meal kinds.
export const PRODUCT_CATEGORIES = ['Nabiał', 'Warzywa', 'Owoce', 'Mięso', 'Sypkie', 'Pieczywo', 'Napoje', 'Przyprawy', 'Mrożonki', 'Inne'];
export const RECIPE_CATEGORIES = ['Śniadanie', 'Zupa', 'Danie główne', 'Sałatka', 'Deser', 'Przekąska', 'Napój', 'Inne'];

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
  cooked: boolean;
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
  category?: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
}

// --- IndexedDB ---

const DB_NAME = 'lista-zadan-meals';
const DB_VERSION = 3;
const RECIPES = 'recipes';
const ENTRIES = 'mealEntries';
const SHOPPING = 'shopping';
const PRODUCTS = 'products';
const PANTRY = 'pantry';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('ingredients')) {
          db.createObjectStore('ingredients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(RECIPES)) {
          db.createObjectStore(RECIPES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ENTRIES)) {
          const entries = db.createObjectStore(ENTRIES, { keyPath: 'id' });
          entries.createIndex('weekStart', 'weekStart', { unique: false });
        }
        if (!db.objectStoreNames.contains(SHOPPING)) {
          db.createObjectStore(SHOPPING, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PRODUCTS)) {
          db.createObjectStore(PRODUCTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PANTRY)) {
          db.createObjectStore(PANTRY, { keyPath: 'id' });
        }
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

export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getMonday(new Date());
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

// --- Category grouping (products & recipes) ---

export const UNCATEGORISED = 'Bez kategorii';

// Ranks a category by its position in the suggested `order`, then unknowns
// (alphabetical), then the "Bez kategorii" bucket last.
function categoryRank(category: string, order: string[]): number {
  if (category === UNCATEGORISED) {
    return order.length + 1;
  }
  const i = order.indexOf(category);
  return i === -1 ? order.length : i;
}

// Distinct categories actually present in the data, ordered by the suggested list
// then alphabetically, with "Bez kategorii" last. Used to build filter chips.
export function presentCategories<T>(items: T[], getCategory: (t: T) => string | undefined, order: string[]): string[] {
  const set = new Set<string>();
  for (const it of items) {
    set.add(getCategory(it)?.trim() || UNCATEGORISED);
  }
  return [...set].sort(
    (a, b) => categoryRank(a, order) - categoryRank(b, order) || a.localeCompare(b, 'pl'),
  );
}

// Groups items by category into ordered sections (same ordering as presentCategories).
export function groupByCategory<T>(
  items: T[],
  getCategory: (t: T) => string | undefined,
  order: string[],
): { category: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const cat = getCategory(it)?.trim() || UNCATEGORISED;
    const bucket = map.get(cat);
    if (bucket) {
      bucket.push(it);
    } else {
      map.set(cat, [it]);
    }
  }
  return [...map.entries()]
    .sort((a, b) => categoryRank(a[0], order) - categoryRank(b[0], order) || a[0].localeCompare(b[0], 'pl'))
    .map(([category, groupItems]) => ({ category, items: groupItems }));
}

// --- Products (dictionary) ---

export async function getProducts(): Promise<Product[]> {
  const db = await getDB();
  const all = (await db.getAll(PRODUCTS)) as Product[];
  return all.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  const all = await getProducts();
  return (q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all).slice(0, 8);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const db = await getDB();
  const all = (await db.getAll(PRODUCTS)) as Product[];
  const existing = all.find((p) => p.name.toLowerCase() === input.name.trim().toLowerCase());
  if (existing) {
    return existing;
  }
  const product: Product = {
    id: generateId(),
    name: input.name.trim(),
    category: input.category?.trim() || undefined,
    baseUnit: input.baseUnit,
    packageSize: input.packageSize && input.packageSize > 0 ? input.packageSize : undefined,
    trackInPantry: input.trackInPantry,
  };
  await db.put(PRODUCTS, product);
  return product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const db = await getDB();
  const product: Product = {
    id,
    name: input.name.trim(),
    category: input.category?.trim() || undefined,
    baseUnit: input.baseUnit,
    packageSize: input.packageSize && input.packageSize > 0 ? input.packageSize : undefined,
    trackInPantry: input.trackInPantry,
  };
  await db.put(PRODUCTS, product);
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PRODUCTS, id);
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
    category: input.category?.trim() || undefined,
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
    category: input.category?.trim() || undefined,
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
    result.push({ ...entry, cooked: entry.cooked ?? false, recipe: recipe ?? null });
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
    cooked: false, // changing the slot's recipe resets the cooked flag
  };
  await db.put(ENTRIES, entry);
}

export async function removeEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(ENTRIES, id);
}

// Loop closer: cooking a meal subtracts its ingredients from the pantry;
// un-marking restores them. Idempotent.
export async function setCooked(id: string, cooked: boolean): Promise<void> {
  const db = await getDB();
  const entry = (await db.get(ENTRIES, id)) as MealEntry | undefined;
  if (!entry || (entry.cooked ?? false) === cooked) {
    return;
  }
  const recipe = (await db.get(RECIPES, entry.recipeId)) as Recipe | undefined;
  if (recipe) {
    await applyRecipeToPantry(recipe, cooked ? -1 : 1);
  }
  await db.put(ENTRIES, { ...entry, cooked });
}

async function applyRecipeToPantry(recipe: Recipe, sign: number): Promise<void> {
  const products = await getProducts();
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
  for (const ri of recipe.recipeIngredients) {
    const product = byName.get(ri.name.toLowerCase());
    if (!product || !product.trackInPantry || ri.quantity <= 0) {
      continue;
    }
    await adjustPantryStock(product.id, sign * ri.quantity);
  }
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
  if (!item) {
    return;
  }
  // Loop closer: buying a quantified, pantry-tracked item adds it to the pantry;
  // un-checking reverses that.
  if ((item.isChecked ?? false) !== isChecked && item.quantity && item.quantity > 0) {
    const products = await getProducts();
    const product = products.find((p) => p.name.toLowerCase() === item.name.trim().toLowerCase());
    if (product && product.trackInPantry) {
      await adjustPantryStock(product.id, isChecked ? item.quantity : -item.quantity);
    }
  }
  await db.put(SHOPPING, { ...item, isChecked });
}

export async function removeShoppingItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(SHOPPING, id);
}

// Pantry-aware: buys only what's missing, rounded up to whole packages.
export async function generateShoppingFromPlan(weekStart: string, days?: number[]): Promise<number> {
  const needs = (await computeNeeds(weekStart, days)).filter((n) => n.toBuy > 0);
  const db = await getDB();
  const now = Date.now();
  const tx = db.transaction(SHOPPING, 'readwrite');
  let count = 0;
  for (const n of needs) {
    const item: ShoppingItem = {
      id: generateId(),
      name: n.name,
      quantity: n.toBuy || undefined,
      unit: n.unit || undefined,
      isChecked: false,
      createdAt: now + count,
    };
    await tx.store.put(item);
    count += 1;
  }
  await tx.done;
  return count;
}

// --- Pantry (spiżarnia) ---

interface PantryRow {
  id: string;
  productId: string;
  quantity: number;
}

export async function getPantry(): Promise<PantryItem[]> {
  const db = await getDB();
  const [rows, products] = await Promise.all([
    db.getAll(PANTRY) as Promise<PantryRow[]>,
    getProducts(),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const result: PantryItem[] = [];
  for (const r of rows) {
    const p = byId.get(r.productId);
    if (!p) {
      continue;
    }
    result.push({ id: r.id, productId: r.productId, name: p.name, baseUnit: p.baseUnit, packageSize: p.packageSize, quantity: r.quantity });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function setPantryStock(productId: string, quantity: number): Promise<void> {
  const db = await getDB();
  const rows = (await db.getAll(PANTRY)) as PantryRow[];
  const existing = rows.find((r) => r.productId === productId);
  const row: PantryRow = { id: existing?.id ?? generateId(), productId, quantity: Math.max(0, quantity) };
  await db.put(PANTRY, row);
}

export async function adjustPantryStock(productId: string, delta: number): Promise<void> {
  const db = await getDB();
  const rows = (await db.getAll(PANTRY)) as PantryRow[];
  const existing = rows.find((r) => r.productId === productId);
  await setPantryStock(productId, (existing?.quantity ?? 0) + delta);
}

export async function removePantryItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PANTRY, id);
}

export async function computeNeeds(weekStart: string, days?: number[]): Promise<NeedItem[]> {
  const [allEntries, products, pantry] = await Promise.all([getWeek(weekStart), getProducts(), getPantry()]);
  // Optional day filter (0=Mon…6=Sun) so the user can shop for just part of the week.
  const entries = days && days.length > 0 ? allEntries.filter((e) => days.includes(e.dayOfWeek)) : allEntries;
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
  const stock = new Map(pantry.map((x) => [x.productId, x.quantity]));
  const agg = new Map<string, { productId: string | null; name: string; unit: string; required: number; packageSize?: number }>();
  for (const e of entries) {
    if (!e.recipe) {
      continue;
    }
    for (const ri of e.recipe.recipeIngredients) {
      const product = byName.get(ri.name.toLowerCase());
      if (product && !product.trackInPantry) {
        continue;
      }
      const key = product ? product.id : `name:${ri.name.toLowerCase()}`;
      const cur = agg.get(key);
      if (cur) {
        cur.required += ri.quantity;
      } else {
        agg.set(key, {
          productId: product?.id ?? null,
          name: product?.name ?? ri.name,
          unit: product?.baseUnit ?? ri.unit,
          required: ri.quantity,
          packageSize: product?.packageSize,
        });
      }
    }
  }
  const needs: NeedItem[] = [];
  for (const a of agg.values()) {
    const inStock = a.productId ? (stock.get(a.productId) ?? 0) : 0;
    const shortfall = Math.max(0, a.required - inStock);
    let toBuy = 0;
    let packages: number | undefined;
    if (shortfall > 0) {
      if (a.packageSize && a.packageSize > 0) {
        packages = Math.ceil(shortfall / a.packageSize);
        toBuy = packages * a.packageSize;
      } else {
        toBuy = shortfall;
      }
    }
    needs.push({ productId: a.productId, name: a.name, unit: a.unit, required: a.required, inStock, shortfall, packageSize: a.packageSize, toBuy, packages });
  }
  return needs.sort((x, y) => x.name.localeCompare(y.name, 'pl'));
}

// --- Storage abstraction (local IndexedDB vs cloud household) ---

export interface MealStorage {
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  createRecipe(input: RecipeInput): Promise<Recipe>;
  updateRecipe(id: string, input: RecipeInput): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getWeek(weekStart: string): Promise<PlannerEntry[]>;
  addEntry(weekStart: string, recipeId: string, dayOfWeek: number, mealType: MealType): Promise<void>;
  removeEntry(id: string): Promise<void>;
  setCooked(id: string, cooked: boolean): Promise<void>;
  getShopping(): Promise<ShoppingItem[]>;
  addShoppingItem(name: string): Promise<void>;
  toggleShoppingItem(id: string, isChecked: boolean): Promise<void>;
  removeShoppingItem(id: string): Promise<void>;
  generateShoppingFromPlan(weekStart: string, days?: number[]): Promise<number>;
  getPantry(): Promise<PantryItem[]>;
  setPantryStock(productId: string, quantity: number): Promise<void>;
  adjustPantryStock(productId: string, delta: number): Promise<void>;
  removePantryItem(id: string): Promise<void>;
  computeNeeds(weekStart: string, days?: number[]): Promise<NeedItem[]>;
}

export const localMealStorage: MealStorage = {
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getWeek,
  addEntry,
  removeEntry,
  setCooked,
  getShopping,
  addShoppingItem: (name) => addShoppingItem(name),
  toggleShoppingItem,
  removeShoppingItem,
  generateShoppingFromPlan,
  getPantry,
  setPantryStock,
  adjustPantryStock,
  removePantryItem,
  computeNeeds,
};
