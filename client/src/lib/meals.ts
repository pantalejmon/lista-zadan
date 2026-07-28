// --- Domain types (shared by the views and the cloud storage adapter) ---
//
// Posiłki są **cloud-only** — dane żyją per gospodarstwo domowe na serwerze
// (patrz `mealsApi.ts` i `server/src/meal/`). W trybie lokalnym (bez konta)
// dostępny jest wyłącznie moduł Zadania, więc tu zostają same typy, stałe
// i helpery prezentacyjne. Algorytmy (zakupy, spiżarnia, „czego brakuje")
// mają jedną implementację — w `server/src/meal/domain/meal.service.ts`.

export type BaseUnit = 'g' | 'ml' | 'szt';

export const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: 'g', label: 'g (gramy)' },
  { value: 'ml', label: 'ml (mililitry)' },
  { value: 'szt', label: 'szt (sztuki)' },
];

// Wartości odżywcze produktu. Jednostka odniesienia zależy od `baseUnit`:
// `g`/`ml` → na 100 g / 100 ml, `szt` → na 1 sztukę (jajko, bułka).
// kcal i trzy makroskładniki chodzą kompletem; błonnik i sól są opcjonalne.
export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  salt?: number;
}

// Podpis jednostki dla formularzy i podglądu makro.
export function nutritionBasisLabel(baseUnit: BaseUnit): string {
  return baseUnit === 'szt' ? 'na 1 szt' : `na 100 ${baseUnit}`;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packageSize?: number;
  trackInPantry: boolean;
  nutrition?: Nutrition;
}

export interface ProductInput {
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packageSize?: number;
  trackInPantry: boolean;
  nutrition?: Nutrition;
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

// Makro przepisu policzone przez serwer ze składników dopasowanych do produktów.
// `coverage` (0–1) mówi, jaka część składników z podaną ilością dała się policzyć,
// a `missing` wymienia resztę — bez tego „450 kcal" z połowy przepisu wygląda
// jak pewnik.
export interface RecipeNutrition {
  total: Nutrition;
  perServing: Nutrition;
  coverage: number;
  missing: string[];
}

export interface Recipe {
  id: string;
  title: string;
  category?: string;
  description?: string;
  instructions: string;
  recipeIngredients: RecipeIngredient[];
  servings: number;
  createdAt: number;
  updatedAt: number;
  nutrition?: RecipeNutrition;
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
  servings?: number;
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

// --- Storage contract (implemented by the cloud adapter in mealsApi.ts) ---

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
