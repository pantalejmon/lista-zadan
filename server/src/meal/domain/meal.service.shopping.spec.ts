import { MealService } from './meal.service';
import { Product } from './product.model';
import { Recipe } from './recipe.model';
import { MealEntry } from './meal-entry.model';
import { MealShoppingItem } from './meal-shopping-item.model';
import { PantryItem } from './pantry-item.model';
import type { RecipeRepositoryPort } from './recipe.repository.port';
import type { MealEntryRepositoryPort } from './meal-entry.repository.port';
import type { MealShoppingItemRepositoryPort } from './meal-shopping-item.repository.port';
import type { ProductRepositoryPort } from './product.repository.port';
import type { PantryItemRepositoryPort } from './pantry-item.repository.port';
import type { NutritionGoalRepositoryPort } from './nutrition-goal.repository.port';
import type { SharingService } from '../../sharing/domain/sharing.service';
import type { MealGateway } from '../web/meal.gateway';

// Zakupy z planu: co trafia na listę i — przede wszystkim — co **nie** trafia
// za drugim razem. Repozytoria są w pamięci, bo sprawdzamy algorytm, nie TypeORM.

const HOUSEHOLD = 'dom-1';
const USER = 'user-1';
const WEEK = '2026-08-03';

const RICE = new Product('p-rice', HOUSEHOLD, 'Ryż', null, 'g', 1000, true, null);
const SALT = new Product('p-salt', HOUSEHOLD, 'Sól', null, 'g', null, false, null);

function recipeWith(ingredients: { name: string; quantity: number; unit: string }[]): Recipe {
  return new Recipe(
    'r-1',
    HOUSEHOLD,
    'Ryż z warzywami',
    null,
    null,
    '',
    ingredients.map((i) => ({ ingredientId: i.name, ...i })),
    1,
    Date.now(),
    Date.now(),
  );
}

function buildService(options: {
  products?: Product[];
  recipe?: Recipe;
  entries?: MealEntry[];
  pantry?: PantryItem[];
  shopping?: MealShoppingItem[];
}) {
  const products = options.products ?? [RICE];
  const recipe = options.recipe ?? recipeWith([{ name: 'Ryż', quantity: 120, unit: 'g' }]);
  const entries = options.entries ?? [MealEntry.createFromRecipe(HOUSEHOLD, WEEK, 0, 'DINNER', recipe.id)];
  const pantry = options.pantry ?? [];
  const shopping = [...(options.shopping ?? [])];

  const recipeRepo = { findById: async (id: string) => (id === recipe.id ? recipe : null) } as RecipeRepositoryPort;
  const entryRepo = { findByWeek: async () => entries } as unknown as MealEntryRepositoryPort;
  const shoppingRepo = {
    findByHousehold: async () => shopping,
    saveMany: async (items: MealShoppingItem[]) => {
      shopping.push(...items);
    },
  } as unknown as MealShoppingItemRepositoryPort;
  const productRepo = { findByHousehold: async () => products } as unknown as ProductRepositoryPort;
  const pantryRepo = { findByHousehold: async () => pantry } as unknown as PantryItemRepositoryPort;
  const goalRepo = {} as NutritionGoalRepositoryPort;
  const sharing = { assertHouseholdPermission: async () => undefined } as unknown as SharingService;
  const gateway = { notifyChanged: () => undefined } as unknown as MealGateway;

  const service = new MealService(
    recipeRepo,
    entryRepo,
    shoppingRepo,
    productRepo,
    pantryRepo,
    goalRepo,
    sharing,
    gateway,
  );
  return { service, shopping };
}

describe('MealService — czego brakuje i generowanie zakupów', () => {
  it('zaokrągla niedobór do pełnych opakowań', async () => {
    const { service } = buildService({});

    const [rice] = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    expect(rice.required).toBe(120);
    expect(rice.toBuy).toBe(1000);
    expect(rice.packages).toBe(1);
  });

  it('odejmuje stan spiżarni', async () => {
    const { service } = buildService({ pantry: [new PantryItem('pi-1', HOUSEHOLD, RICE.id, 500)] });

    const [rice] = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    expect(rice.inStock).toBe(500);
    expect(rice.toBuy).toBe(0);
  });

  it('pomija produkty spoza spiżarni („do smaku")', async () => {
    const { service } = buildService({
      products: [RICE, SALT],
      recipe: recipeWith([
        { name: 'Ryż', quantity: 120, unit: 'g' },
        { name: 'Sól', quantity: 5, unit: 'g' },
      ]),
    });

    const needs = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    expect(needs.map((n) => n.name)).toEqual(['Ryż']);
  });

  it('odejmuje to, co leży już na liście zakupów (#109)', async () => {
    const { service } = buildService({
      shopping: [MealShoppingItem.create(HOUSEHOLD, 'Ryż', 1000, 'g')],
    });

    const [rice] = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    expect(rice.shortfall).toBe(120); // niedobór wobec samej spiżarni zostaje widoczny
    expect(rice.onList).toBe(1000);
    expect(rice.toBuy).toBe(0);
  });

  it('pozycja kupiona nie pokrywa już potrzeby', async () => {
    const bought = MealShoppingItem.create(HOUSEHOLD, 'Ryż', 1000, 'g').withChecked(true);
    const { service } = buildService({ shopping: [bought] });

    const [rice] = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    expect(rice.onList).toBe(0);
    expect(rice.toBuy).toBe(1000);
  });

  it('ręczny dopisek bez ilości zamyka potrzebę', async () => {
    const { service } = buildService({ shopping: [MealShoppingItem.create(HOUSEHOLD, 'ryż')] });

    const [rice] = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    expect(rice.onListUnknownQty).toBe(true);
    expect(rice.toBuy).toBe(0);
  });

  it('częściowe pokrycie listą dokupuje resztę, znów w pełnych opakowaniach', async () => {
    const { service } = buildService({
      recipe: recipeWith([{ name: 'Ryż', quantity: 2500, unit: 'g' }]),
      shopping: [MealShoppingItem.create(HOUSEHOLD, 'Ryż', 1000, 'g')],
    });

    const [rice] = await service.computeNeeds(HOUSEHOLD, USER, WEEK);

    // Brakuje 1500 g, a ryż chodzi po 1000 g — dokupujemy 2 opakowania, nie 1,5.
    expect(rice.onList).toBe(1000);
    expect(rice.packages).toBe(2);
    expect(rice.toBuy).toBe(2000);
  });

  it('drugie „Generuj z planu" nie dokłada drugiego kompletu (#108)', async () => {
    const { service, shopping } = buildService({});

    const first = await service.generateFromPlan(HOUSEHOLD, USER, WEEK);
    const second = await service.generateFromPlan(HOUSEHOLD, USER, WEEK);

    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(shopping).toHaveLength(1);
    expect(shopping[0].quantity).toBe(1000);
  });

  it('generowanie nie rusza ręcznych dopisków', async () => {
    const manual = MealShoppingItem.create(HOUSEHOLD, 'Papier toaletowy');
    const { service, shopping } = buildService({ shopping: [manual] });

    await service.generateFromPlan(HOUSEHOLD, USER, WEEK);

    expect(shopping).toContain(manual);
    expect(shopping).toHaveLength(2);
  });
});
