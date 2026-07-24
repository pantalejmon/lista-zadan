import type {
  MealStorage,
  Recipe,
  Product,
  ProductInput,
  PantryItem,
  NeedItem,
  PlannerEntry,
  ShoppingItem,
  RecipeInput,
  MealType,
} from './meals';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

// Cloud meals are scoped to a household. All data is shared with every household member.
export function createCloudMealStorage(householdId: string): MealStorage {
  const hh = encodeURIComponent(householdId);

  return {
    getRecipes: () => request<Recipe[]>(`/meals/recipes?householdId=${hh}`),

    getRecipe: (id) => request<Recipe>(`/meals/recipes/${id}`),

    createRecipe: (input: RecipeInput) =>
      request<Recipe>(`/meals/recipes?householdId=${hh}`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    updateRecipe: (id, input: RecipeInput) =>
      request<Recipe>(`/meals/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),

    deleteRecipe: (id) => request<void>(`/meals/recipes/${id}`, { method: 'DELETE' }),

    getProducts: () => request<Product[]>(`/meals/products?householdId=${hh}`),

    searchProducts: (query) =>
      request<Product[]>(`/meals/products?householdId=${hh}&q=${encodeURIComponent(query)}`),

    createProduct: (input: ProductInput) =>
      request<Product>(`/meals/products?householdId=${hh}`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    updateProduct: (id, input: ProductInput) =>
      request<Product>(`/meals/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),

    deleteProduct: (id) => request<void>(`/meals/products/${id}`, { method: 'DELETE' }),

    getWeek: (weekStart) =>
      request<PlannerEntry[]>(`/meals/planner?householdId=${hh}&week=${weekStart}`),

    addEntry: async (weekStart, recipeId, dayOfWeek, mealType: MealType) => {
      await request<unknown>(`/meals/planner/entry?householdId=${hh}`, {
        method: 'POST',
        body: JSON.stringify({ weekStart, recipeId, dayOfWeek, mealType }),
      });
    },

    removeEntry: (id) => request<void>(`/meals/planner/entry/${id}`, { method: 'DELETE' }),

    getShopping: () => request<ShoppingItem[]>(`/meals/shopping?householdId=${hh}`),

    addShoppingItem: async (name) => {
      await request<unknown>(`/meals/shopping?householdId=${hh}`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },

    toggleShoppingItem: async (id, isChecked) => {
      await request<unknown>(`/meals/shopping/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isChecked }),
      });
    },

    removeShoppingItem: (id) => request<void>(`/meals/shopping/${id}`, { method: 'DELETE' }),

    generateShoppingFromPlan: async (weekStart) => {
      const res = await request<{ count: number }>(
        `/meals/shopping/generate?householdId=${hh}&week=${weekStart}`,
        { method: 'POST' },
      );
      return res.count;
    },

    getPantry: () => request<PantryItem[]>(`/meals/pantry?householdId=${hh}`),

    setPantryStock: async (productId, quantity) => {
      await request<unknown>(`/meals/pantry?householdId=${hh}`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
    },

    adjustPantryStock: async (productId, delta) => {
      await request<unknown>(`/meals/pantry?householdId=${hh}`, {
        method: 'PATCH',
        body: JSON.stringify({ productId, delta }),
      });
    },

    removePantryItem: (id) => request<void>(`/meals/pantry/${id}`, { method: 'DELETE' }),

    computeNeeds: (weekStart) =>
      request<NeedItem[]>(`/meals/needs?householdId=${hh}&week=${weekStart}`),
  };
}
