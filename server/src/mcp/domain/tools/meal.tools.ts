import { MealService } from '../../../meal/domain/meal.service';
import { CreateProductDto } from '../../../meal/web/dto/create-product.dto';
import { CreateRecipeDto } from '../../../meal/web/dto/create-recipe.dto';
import { RecipeIngredientDto } from '../../../meal/web/dto/recipe-ingredient.dto';
import { CreateEntryDto } from '../../../meal/web/dto/create-entry.dto';
import type { BaseUnit } from '../../../meal/domain/product.model';
import type { MealType } from '../../../meal/domain/recipe-ingredient';
import { McpTool, stringArg, requireStringArg, numberArg, requireNumberArg, boolArg } from '../mcp-tool';

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
        'Zwraca czego brakuje (plan minus spiżarnia, zaokrąglone do opakowań). Opcjonalnie week oraz days ' +
        '(lista dni tygodnia 0=pon…6=niedz, aby liczyć tylko wybrane dni).',
      requiredScopes: ['meals:read'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, week: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' }, days: daysSchema },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.computeNeeds(householdId, ctx.userId, stringArg(args, 'week') ?? currentMonday(), parseDays(args));
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
        'Generuje listę zakupów z planu, kupując tylko braki zaokrąglone do opakowań. Opcjonalnie week oraz days ' +
        '(lista dni 0=pon…6=niedz, aby kupić tylko na wybrane dni).',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, week: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' }, days: daysSchema },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const count = await mealService.generateFromPlan(
          householdId,
          ctx.userId,
          stringArg(args, 'week') ?? currentMonday(),
          parseDays(args),
        );
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
    // ---- recipes CRUD ----
    {
      name: 'get_recipe',
      description: 'Zwraca jeden przepis ze składnikami. Wymaga recipeId.',
      requiredScopes: ['meals:read'],
      inputSchema: {
        type: 'object',
        properties: { recipeId: { type: 'string', description: 'ID przepisu' } },
        required: ['recipeId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return mealService.getRecipe(requireStringArg(args, 'recipeId'), ctx.userId);
      },
    },
    {
      name: 'create_recipe',
      description:
        'Tworzy przepis. Wymaga title i instructions. Opcjonalnie description oraz ingredients ' +
        '(lista {name, quantity?, unit?, ingredientId?}).',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          title: { type: 'string', description: 'Tytuł przepisu' },
          instructions: { type: 'string', description: 'Sposób przygotowania' },
          description: { type: 'string', description: 'Krótki opis (opcjonalnie)' },
          ingredients: { type: 'array', description: 'Składniki', items: ingredientSchema },
        },
        required: ['title', 'instructions'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.createRecipe(buildRecipeDto(args), householdId, ctx.userId);
      },
    },
    {
      name: 'update_recipe',
      description:
        'Aktualizuje przepis (pełny zestaw pól). Wymaga recipeId, title i instructions. Opcjonalnie description, ingredients.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          recipeId: { type: 'string', description: 'ID przepisu' },
          title: { type: 'string', description: 'Tytuł' },
          instructions: { type: 'string', description: 'Sposób przygotowania' },
          description: { type: 'string', description: 'Opis (opcjonalnie)' },
          ingredients: { type: 'array', description: 'Składniki', items: ingredientSchema },
        },
        required: ['recipeId', 'title', 'instructions'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return mealService.updateRecipe(requireStringArg(args, 'recipeId'), buildRecipeDto(args), ctx.userId);
      },
    },
    {
      name: 'delete_recipe',
      description: 'Usuwa przepis (i jego wpisy w planerze). Wymaga recipeId.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { recipeId: { type: 'string', description: 'ID przepisu' } },
        required: ['recipeId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await mealService.deleteRecipe(requireStringArg(args, 'recipeId'), ctx.userId);
        return { deleted: true };
      },
    },
    // ---- products update/delete ----
    {
      name: 'update_product',
      description:
        'Aktualizuje produkt (pełny zestaw pól). Wymaga productId, name i baseUnit (g/ml/szt). ' +
        'Opcjonalnie packageSize, category, trackInPantry.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'ID produktu' },
          name: { type: 'string', description: 'Nazwa' },
          baseUnit: { type: 'string', enum: ['g', 'ml', 'szt'], description: 'Jednostka bazowa' },
          packageSize: { type: 'number', description: 'Rozmiar opakowania' },
          category: { type: 'string', description: 'Kategoria' },
          trackInPantry: { type: 'boolean', description: 'Śledzić w spiżarni' },
        },
        required: ['productId', 'name', 'baseUnit'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
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
        const trackInPantry = boolArg(args, 'trackInPantry');
        if (trackInPantry !== undefined) {
          dto.trackInPantry = trackInPantry;
        }
        return mealService.updateProduct(requireStringArg(args, 'productId'), ctx.userId, dto);
      },
    },
    {
      name: 'delete_product',
      description: 'Usuwa produkt ze słownika. Wymaga productId.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { productId: { type: 'string', description: 'ID produktu' } },
        required: ['productId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await mealService.deleteProduct(requireStringArg(args, 'productId'), ctx.userId);
        return { deleted: true };
      },
    },
    // ---- planner ----
    {
      name: 'plan_meal',
      description:
        'Przypisuje przepis do dnia i pory w planie tygodnia (nadpisuje slot). Wymaga recipeId, weekStart (poniedziałek YYYY-MM-DD), ' +
        'dayOfWeek (0=poniedziałek … 6=niedziela) i mealType (BREAKFAST/LUNCH/DINNER/SNACK).',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          recipeId: { type: 'string', description: 'ID przepisu' },
          weekStart: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' },
          dayOfWeek: { type: 'number', description: '0=pon … 6=niedz' },
          mealType: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], description: 'Pora posiłku' },
        },
        required: ['recipeId', 'weekStart', 'dayOfWeek', 'mealType'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateEntryDto();
        dto.recipeId = requireStringArg(args, 'recipeId');
        dto.weekStart = requireStringArg(args, 'weekStart');
        dto.dayOfWeek = requireNumberArg(args, 'dayOfWeek');
        dto.mealType = requireStringArg(args, 'mealType') as MealType;
        return mealService.addEntry(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'mark_meal_cooked',
      description:
        'Oznacza zaplanowany posiłek jako ugotowany (odejmuje składniki ze spiżarni) lub cofa (przywraca). ' +
        'Wymaga entryId; cooked domyślnie true.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          entryId: { type: 'string', description: 'ID wpisu w planerze' },
          cooked: { type: 'boolean', description: 'true = ugotowane (domyślnie), false = cofnij' },
        },
        required: ['entryId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const cooked = boolArg(args, 'cooked') ?? true;
        return mealService.setCooked(requireStringArg(args, 'entryId'), ctx.userId, cooked);
      },
    },
    {
      name: 'remove_meal_entry',
      description: 'Usuwa wpis z planera. Wymaga entryId.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { entryId: { type: 'string', description: 'ID wpisu w planerze' } },
        required: ['entryId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await mealService.removeEntry(requireStringArg(args, 'entryId'), ctx.userId);
        return { deleted: true };
      },
    },
    // ---- shopping item state ----
    {
      name: 'check_shopping_item',
      description:
        'Zaznacza/odznacza pozycję na liście zakupów posiłków. Zaznaczenie pozycji o znanej ilości (produkt śledzony) ' +
        'dodaje ją do spiżarni („kupione"), odznaczenie cofa. Wymaga itemId; isChecked domyślnie true.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'ID pozycji zakupowej' },
          isChecked: { type: 'boolean', description: 'true = kupione (domyślnie), false = cofnij' },
        },
        required: ['itemId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const isChecked = boolArg(args, 'isChecked') ?? true;
        return mealService.toggleShoppingItem(requireStringArg(args, 'itemId'), ctx.userId, isChecked);
      },
    },
    {
      name: 'delete_shopping_item',
      description: 'Usuwa pozycję z listy zakupów posiłków. Wymaga itemId.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'ID pozycji zakupowej' } },
        required: ['itemId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await mealService.removeShoppingItem(requireStringArg(args, 'itemId'), ctx.userId);
        return { deleted: true };
      },
    },
    // ---- pantry adjust/delete ----
    {
      name: 'adjust_pantry_stock',
      description: 'Zmienia stan produktu w spiżarni o wartość delta (dodatnia = dodaj, ujemna = zdejmij). Wymaga productId i delta.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          productId: { type: 'string', description: 'ID produktu' },
          delta: { type: 'number', description: 'Zmiana stanu (w jednostce bazowej; +/-)' },
        },
        required: ['productId', 'delta'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.adjustStock(householdId, ctx.userId, requireStringArg(args, 'productId'), requireNumberArg(args, 'delta'));
      },
    },
    {
      name: 'remove_pantry_item',
      description: 'Usuwa pozycję ze spiżarni. Wymaga pantryItemId.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: { pantryItemId: { type: 'string', description: 'ID pozycji spiżarni' } },
        required: ['pantryItemId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await mealService.removePantryItem(requireStringArg(args, 'pantryItemId'), ctx.userId);
        return { deleted: true };
      },
    },
  ];
}

const daysSchema = {
  type: 'array',
  description: 'Dni tygodnia do uwzględnienia: 0=poniedziałek … 6=niedziela (pomiń = cały tydzień)',
  items: { type: 'number', minimum: 0, maximum: 6 },
} as const;

// Extracts a valid weekday-number list (0–6) from the `days` arg, or undefined.
function parseDays(args: Record<string, unknown>): number[] | undefined {
  if (!Array.isArray(args.days)) {
    return undefined;
  }
  const days = args.days.filter((d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length > 0 ? days : undefined;
}

const ingredientSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Nazwa składnika' },
    quantity: { type: 'number', description: 'Ilość (opcjonalnie)' },
    unit: { type: 'string', description: 'Jednostka (opcjonalnie)' },
    ingredientId: { type: 'string', description: 'ID produktu ze słownika (opcjonalnie)' },
  },
  required: ['name'],
  additionalProperties: false,
} as const;

function buildRecipeDto(args: Record<string, unknown>): CreateRecipeDto {
  const dto = new CreateRecipeDto();
  dto.title = requireStringArg(args, 'title');
  dto.instructions = requireStringArg(args, 'instructions');
  const description = stringArg(args, 'description');
  if (description) {
    dto.description = description;
  }
  if (Array.isArray(args.ingredients)) {
    dto.recipeIngredients = args.ingredients
      .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
      .map((raw) => {
        const ing = new RecipeIngredientDto();
        ing.name = requireStringArg(raw, 'name');
        const quantity = numberArg(raw, 'quantity');
        if (quantity !== undefined) {
          ing.quantity = quantity;
        }
        const unit = stringArg(raw, 'unit');
        if (unit) {
          ing.unit = unit;
        }
        const ingredientId = stringArg(raw, 'ingredientId');
        if (ingredientId) {
          ing.ingredientId = ingredientId;
        }
        return ing;
      });
  }
  return dto;
}
