import { MealService } from '../../../meal/domain/meal.service';
import { CreateProductDto } from '../../../meal/web/dto/create-product.dto';
import type { BaseUnit } from '../../../meal/domain/product.model';
import { McpTool, stringArg, requireStringArg } from '../mcp-tool';

function numberArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function currentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Agent tools for the meals module (recipes, planner, shopping). Household-scoped:
// a household-bound token pins the household; otherwise pass householdId.
export function buildMealTools(mealService: MealService): McpTool[] {
  const householdProp = {
    householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token jest przypięty do gospodarstwa)' },
  };

  return [
    {
      name: 'list_recipes',
      description: 'Zwraca przepisy gospodarstwa.',
      requiredScopes: ['meals:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getRecipes(householdId, ctx.userId);
      },
    },
    {
      name: 'get_week_plan',
      description: 'Zwraca plan posiłków na tydzień. Opcjonalnie week (poniedziałek YYYY-MM-DD); domyślnie bieżący tydzień.',
      requiredScopes: ['meals:read'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, week: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getWeek(householdId, ctx.userId, stringArg(args, 'week') ?? currentMonday());
      },
    },
    {
      name: 'get_shopping_list',
      description: 'Zwraca listę zakupów posiłków gospodarstwa.',
      requiredScopes: ['meals:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getShopping(householdId, ctx.userId);
      },
    },
    {
      name: 'what_is_missing',
      description:
        'Zwraca czego brakuje w tym tygodniu (plan minus spiżarnia, zaokrąglone do opakowań). Opcjonalnie week.',
      requiredScopes: ['meals:read'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, week: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.computeNeeds(householdId, ctx.userId, stringArg(args, 'week') ?? currentMonday());
      },
    },
    {
      name: 'add_shopping_item',
      description: 'Dodaje pozycję do listy zakupów posiłków. Wymaga name.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, name: { type: 'string', description: 'Nazwa produktu' } },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const name = stringArg(args, 'name');
        if (!name) {
          throw new Error('Missing required argument: name');
        }
        return mealService.addShoppingItem(householdId, ctx.userId, name);
      },
    },
    {
      name: 'generate_shopping_from_plan',
      description:
        'Generuje listę zakupów z planu tygodnia, kupując tylko braki zaokrąglone do opakowań. Opcjonalnie week.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, week: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const count = await mealService.generateFromPlan(householdId, ctx.userId, stringArg(args, 'week') ?? currentMonday());
        return { added: count };
      },
    },
    // ---- pantry & products (#34) ----
    {
      name: 'list_products',
      description: 'Zwraca słownik produktów gospodarstwa (nazwa, jednostka, opakowanie, czy śledzone w spiżarni).',
      requiredScopes: ['meals:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getProducts(householdId, ctx.userId);
      },
    },
    {
      name: 'get_pantry',
      description: 'Zwraca aktualny stan spiżarni gospodarstwa (produkt + ilość).',
      requiredScopes: ['meals:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getPantry(householdId, ctx.userId);
      },
    },
    {
      name: 'create_product',
      description:
        'Dodaje produkt do słownika. Wymaga name i baseUnit (g/ml/szt). Opcjonalnie packageSize, category, trackInPantry.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          name: { type: 'string', description: 'Nazwa produktu' },
          baseUnit: { type: 'string', enum: ['g', 'ml', 'szt'], description: 'Jednostka bazowa' },
          packageSize: { type: 'number', description: 'Rozmiar standardowego opakowania' },
          category: { type: 'string', description: 'Kategoria (opcjonalnie)' },
          trackInPantry: { type: 'boolean', description: 'Czy śledzić w spiżarni (false = „do smaku")' },
        },
        required: ['name', 'baseUnit'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateProductDto();
        dto.name = requireStringArg(args, 'name');
        dto.baseUnit = requireStringArg(args, 'baseUnit') as BaseUnit;
        const packageSize = numberArg(args, 'packageSize');
        if (packageSize !== undefined) {
          dto.packageSize = packageSize;
        }
        const category = stringArg(args, 'category');
        if (category) {
          dto.category = category;
        }
        if (typeof args.trackInPantry === 'boolean') {
          dto.trackInPantry = args.trackInPantry;
        }
        return mealService.createProduct(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'set_pantry_stock',
      description: 'Ustawia stan produktu w spiżarni na konkretną wartość. Wymaga productId i quantity.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          productId: { type: 'string', description: 'ID produktu' },
          quantity: { type: 'number', description: 'Nowy stan (w jednostce bazowej)' },
        },
        required: ['productId', 'quantity'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const productId = requireStringArg(args, 'productId');
        const quantity = numberArg(args, 'quantity');
        if (quantity === undefined) {
          throw new Error('Missing required argument: quantity');
        }
        return mealService.setStock(householdId, ctx.userId, productId, quantity);
      },
    },
  ];
}
