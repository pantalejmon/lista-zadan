import { MealService } from './meal.service';
import { Product } from './product.model';
import { Recipe } from './recipe.model';
import { MealEntry } from './meal-entry.model';
import type { RecipeRepositoryPort } from './recipe.repository.port';
import type { MealEntryRepositoryPort } from './meal-entry.repository.port';
import type { MealShoppingItemRepositoryPort } from './meal-shopping-item.repository.port';
import type { ProductRepositoryPort } from './product.repository.port';
import type { PantryItemRepositoryPort } from './pantry-item.repository.port';
import type { NutritionGoalRepositoryPort } from './nutrition-goal.repository.port';
import type { SharingService } from '../../sharing/domain/sharing.service';
import type { MealGateway } from '../web/meal.gateway';

// Bilans liczy tylko posiłki, które mają i domowników, i wartości odżywcze.
// Tu pilnujemy obu bramek: domyślnego przypisania domowników przy planowaniu
// oraz tego, że pominięte posiłki są **policzone i nazwane**, a nie milcząco
// wyrzucone (#111).

const HOUSEHOLD = 'dom-1';
const USER = 'user-1';
const WEEK = '2026-08-03';

const MEMBERS = [
  { userId: 'user-1', displayName: 'Jan', email: 'jan@example.com', role: 'owner' },
  { userId: 'user-2', displayName: 'Kasia', email: 'kasia@example.com', role: 'editor' },
];

const EGG = new Product('p-egg', HOUSEHOLD, 'Jajko', null, 'szt', null, true, {
  kcal: 78, protein: 6.3, fat: 5.3, carbs: 0.6,
});
const HERBS = new Product('p-herbs', HOUSEHOLD, 'Zioła', null, 'g', null, true, null);

function recipe(id: string, ingredients: { name: string; quantity: number; unit: string }[]): Recipe {
  return new Recipe(
    id, HOUSEHOLD, `Przepis ${id}`, null, null, '',
    ingredients.map((i) => ({ ingredientId: i.name, ...i })),
    1, Date.now(), Date.now(),
  );
}

function buildService(options: { recipes?: Recipe[]; entries?: MealEntry[]; products?: Product[] }) {
  const recipes = options.recipes ?? [];
  const entries = options.entries ?? [];
  const products = options.products ?? [EGG, HERBS];
  const saved: MealEntry[] = [];

  const service = new MealService(
    { findById: async (id: string) => recipes.find((r) => r.id === id) ?? null } as RecipeRepositoryPort,
    {
      findByWeek: async () => entries,
      findSlot: async () => null,
      save: async (entry: MealEntry) => {
        saved.push(entry);
      },
    } as unknown as MealEntryRepositoryPort,
    {} as MealShoppingItemRepositoryPort,
    { findByHousehold: async () => products } as unknown as ProductRepositoryPort,
    {} as PantryItemRepositoryPort,
    { findByHousehold: async () => [] } as unknown as NutritionGoalRepositoryPort,
    {
      assertHouseholdPermission: async () => undefined,
      getHouseholdMembers: async () => MEMBERS,
    } as unknown as SharingService,
    { notifyChanged: () => undefined } as unknown as MealGateway,
  );
  return { service, saved };
}

describe('MealService — uczestnicy posiłku', () => {
  it('zaplanowany posiłek domyślnie przypisuje wszystkich domowników po jednej porcji', async () => {
    const { service, saved } = buildService({ recipes: [recipe('r-1', [])] });

    await service.addEntry(HOUSEHOLD, USER, {
      weekStart: WEEK,
      dayOfWeek: 0,
      mealType: 'DINNER',
      recipeId: 'r-1',
    });

    expect(saved[0].participants).toEqual([
      { userId: 'user-1', portions: 1 },
      { userId: 'user-2', portions: 1 },
    ]);
  });

  it('jawnie pusta lista uczestników zostaje pusta', async () => {
    const { service, saved } = buildService({ recipes: [recipe('r-1', [])] });

    await service.addEntry(HOUSEHOLD, USER, {
      weekStart: WEEK,
      dayOfWeek: 0,
      mealType: 'DINNER',
      recipeId: 'r-1',
      participants: [],
    });

    expect(saved[0].participants).toEqual([]);
  });

  it('podani uczestnicy wygrywają z domyślnymi', async () => {
    const { service, saved } = buildService({ recipes: [recipe('r-1', [])] });

    await service.addEntry(HOUSEHOLD, USER, {
      weekStart: WEEK,
      dayOfWeek: 0,
      mealType: 'DINNER',
      recipeId: 'r-1',
      participants: [{ userId: 'user-2', portions: 2 }],
    });

    expect(saved[0].participants).toEqual([{ userId: 'user-2', portions: 2 }]);
  });
});

describe('MealService — dlaczego bilans nie policzył', () => {
  it('zlicza posiłki bez przypisanych domowników', async () => {
    const withRecipe = recipe('r-1', [{ name: 'Jajko', quantity: 2, unit: 'szt' }]);
    const { service } = buildService({
      recipes: [withRecipe],
      entries: [MealEntry.createFromRecipe(HOUSEHOLD, WEEK, 0, 'BREAKFAST', 'r-1')],
    });

    const balance = await service.getNutritionBalance(HOUSEHOLD, USER, WEEK, false);

    expect(balance.skipped.noParticipants).toBe(1);
    expect(balance.skipped.noNutrition).toBe(0);
  });

  it('zlicza posiłki bez wartości odżywczych i nazywa brakujące produkty', async () => {
    const noMacros = recipe('r-2', [{ name: 'Zioła', quantity: 5, unit: 'g' }]);
    const { service } = buildService({
      recipes: [noMacros],
      entries: [
        MealEntry.createFromRecipe(HOUSEHOLD, WEEK, 0, 'DINNER', 'r-2', [{ userId: 'user-1', portions: 1 }]),
      ],
    });

    const balance = await service.getNutritionBalance(HOUSEHOLD, USER, WEEK, false);

    expect(balance.skipped.noNutrition).toBe(1);
    expect(balance.skipped.missingProducts).toEqual(['Zioła']);
  });

  it('policzony posiłek nie trafia do pominiętych, ale niepełne makro jest zgłoszone', async () => {
    const mixed = recipe('r-3', [
      { name: 'Jajko', quantity: 2, unit: 'szt' },
      { name: 'Zioła', quantity: 5, unit: 'g' },
    ]);
    const { service } = buildService({
      recipes: [mixed],
      entries: [
        MealEntry.createFromRecipe(HOUSEHOLD, WEEK, 0, 'DINNER', 'r-3', [{ userId: 'user-1', portions: 1 }]),
      ],
    });

    const balance = await service.getNutritionBalance(HOUSEHOLD, USER, WEEK, false);

    expect(balance.skipped.noParticipants).toBe(0);
    expect(balance.skipped.noNutrition).toBe(0);
    expect(balance.skipped.missingProducts).toEqual(['Zioła']);
    const jan = balance.members.find((m) => m.userId === 'user-1');
    expect(jan?.days[0].meals[0].complete).toBe(false);
  });

  it('filtr „tylko ugotowane" nie zgłasza nieugotowanych jako problemu', async () => {
    const withRecipe = recipe('r-1', [{ name: 'Jajko', quantity: 2, unit: 'szt' }]);
    const { service } = buildService({
      recipes: [withRecipe],
      entries: [MealEntry.createFromRecipe(HOUSEHOLD, WEEK, 0, 'BREAKFAST', 'r-1')],
    });

    const balance = await service.getNutritionBalance(HOUSEHOLD, USER, WEEK, true);

    expect(balance.skipped.noParticipants).toBe(0);
  });
});
