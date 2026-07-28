import { MealService } from '../../../meal/domain/meal.service';
import { CreateProductDto } from '../../../meal/web/dto/create-product.dto';
import { NutritionDto } from '../../../meal/web/dto/nutrition.dto';
import { MealParticipantDto } from '../../../meal/web/dto/meal-participant.dto';
import { AdjustEntryDto } from '../../../meal/web/dto/adjust-entry.dto';
import { IngredientOverrideDto } from '../../../meal/web/dto/ingredient-override.dto';
import { CustomMealDto } from '../../../meal/web/dto/custom-meal.dto';
import { SetNutritionGoalDto } from '../../../meal/web/dto/set-nutrition-goal.dto';
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
      name: 'get_nutrition_balance',
      description:
        'Zwraca bilans odżywczy domowników na tydzień: dziennie i łącznie, z rozbiciem na posiłki oraz celem ' +
        'każdego domownika. Opcjonalnie week (poniedziałek YYYY-MM-DD; domyślnie bieżący) i onlyCooked ' +
        '(domyślnie false = liczone są posiłki zaplanowane, nie tylko odhaczone). Posiłki bez przypisanych ' +
        'domowników nie wchodzą do bilansu.',
      requiredScopes: ['meals:read'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          week: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' },
          onlyCooked: { type: 'boolean', description: 'Tylko posiłki odhaczone jako ugotowane' },
        },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getNutritionBalance(
          householdId,
          ctx.userId,
          stringArg(args, 'week') ?? currentMonday(),
          boolArg(args, 'onlyCooked') ?? false,
        );
      },
    },
    {
      name: 'get_nutrition_goals',
      description: 'Zwraca dzienne cele odżywcze domowników (kcal, białko, tłuszcz, węglowodany).',
      requiredScopes: ['meals:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getNutritionGoals(householdId, ctx.userId);
      },
    },
    {
      name: 'set_nutrition_goal',
      description:
        'Ustawia dzienny cel odżywczy domownika. Wymaga userId (z list_household_members), kcal, protein, ' +
        'fat i carbs. Nadpisuje poprzedni cel tej osoby.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          userId: { type: 'string', description: 'ID domownika' },
          kcal: { type: 'number', description: 'Cel dzienny: energia (kcal)' },
          protein: { type: 'number', description: 'Cel dzienny: białko (g)' },
          fat: { type: 'number', description: 'Cel dzienny: tłuszcz (g)' },
          carbs: { type: 'number', description: 'Cel dzienny: węglowodany (g)' },
        },
        required: ['userId', 'kcal', 'protein', 'fat', 'carbs'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new SetNutritionGoalDto();
        dto.userId = requireStringArg(args, 'userId');
        dto.kcal = requireNumberArg(args, 'kcal');
        dto.protein = requireNumberArg(args, 'protein');
        dto.fat = requireNumberArg(args, 'fat');
        dto.carbs = requireNumberArg(args, 'carbs');
        return mealService.setNutritionGoal(householdId, ctx.userId, dto);
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
        'Dodaje produkt do słownika. Wymaga name i baseUnit (g/ml/szt). Opcjonalnie packageSize, category, ' +
        'trackInPantry oraz nutrition (wartości odżywcze).',
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
          nutrition: nutritionSchema,
        },
        required: ['name', 'baseUnit'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.createProduct(householdId, ctx.userId, buildProductDto(args));
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
      description:
        'Zwraca jeden przepis ze składnikami, liczbą porcji i policzonym makro (pole nutrition). Wymaga recipeId.',
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
      name: 'get_recipe_nutrition',
      description:
        'Zwraca same wartości odżywcze przepisu: total, perServing, coverage (0–1) oraz missing — listę ' +
        'składników, których nie policzono (brak produktu, brak makro albo nieprzeliczalna jednostka). ' +
        'Wymaga recipeId.',
      requiredScopes: ['meals:read'],
      inputSchema: {
        type: 'object',
        properties: { recipeId: { type: 'string', description: 'ID przepisu' } },
        required: ['recipeId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const recipe = await mealService.getRecipe(requireStringArg(args, 'recipeId'), ctx.userId);
        return { recipeId: recipe.id, title: recipe.title, servings: recipe.servings, ...recipe.nutrition };
      },
    },
    {
      name: 'create_recipe',
      description:
        'Tworzy przepis. Wymaga title i instructions. Opcjonalnie description, servings (liczba porcji, ' +
        'domyślnie 1) oraz ingredients (lista {name, quantity?, unit?, ingredientId?}).',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          title: { type: 'string', description: 'Tytuł przepisu' },
          category: { type: 'string', description: 'Kategoria (np. Śniadanie, Zupa, Deser)' },
          instructions: { type: 'string', description: 'Sposób przygotowania' },
          description: { type: 'string', description: 'Krótki opis (opcjonalnie)' },
          servings: { type: 'integer', minimum: 1, description: 'Na ile porcji jest przepis (domyślnie 1)' },
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
        'Aktualizuje przepis (pełny zestaw pól). Wymaga recipeId, title i instructions. Opcjonalnie ' +
        'description, servings, ingredients.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          recipeId: { type: 'string', description: 'ID przepisu' },
          title: { type: 'string', description: 'Tytuł' },
          category: { type: 'string', description: 'Kategoria (np. Śniadanie, Zupa, Deser)' },
          instructions: { type: 'string', description: 'Sposób przygotowania' },
          description: { type: 'string', description: 'Opis (opcjonalnie)' },
          servings: { type: 'integer', minimum: 1, description: 'Na ile porcji jest przepis' },
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
        'Aktualizuje produkt (pełny zestaw pól — pominięte pola są czyszczone). Wymaga productId, name ' +
        'i baseUnit (g/ml/szt). Opcjonalnie packageSize, category, trackInPantry oraz nutrition.',
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
          nutrition: nutritionSchema,
        },
        required: ['productId', 'name', 'baseUnit'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return mealService.updateProduct(requireStringArg(args, 'productId'), ctx.userId, buildProductDto(args));
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
        'dayOfWeek (0=poniedziałek … 6=niedziela) i mealType (BREAKFAST/LUNCH/DINNER/SNACK). ' +
        'Opcjonalnie participants — kto je i w ilu porcjach.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          recipeId: { type: 'string', description: 'ID przepisu' },
          weekStart: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' },
          dayOfWeek: { type: 'number', description: '0=pon … 6=niedz' },
          mealType: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], description: 'Pora posiłku' },
          participants: participantsSchema,
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
        const participants = parseParticipants(args);
        if (participants) {
          dto.participants = participants;
        }
        return mealService.addEntry(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'plan_custom_meal',
      description:
        'Wpisuje do planera posiłek **bez przepisu** („jogurt i banan"). Wymaga title, weekStart ' +
        '(poniedziałek YYYY-MM-DD), dayOfWeek (0=pon…6=niedz) i mealType. Opcjonalnie ingredients — ' +
        'ze składnikami posiłek liczy się do zakupów, spiżarni i bilansu tak samo jak przepis. ' +
        'Nadpisuje zajęty slot.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          title: { type: 'string', description: 'Nazwa posiłku' },
          weekStart: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD' },
          dayOfWeek: { type: 'number', description: '0=pon … 6=niedz' },
          mealType: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], description: 'Pora posiłku' },
          ingredients: { type: 'array', description: 'Składniki (opcjonalnie)', items: ingredientSchema },
          participants: participantsSchema,
        },
        required: ['title', 'weekStart', 'dayOfWeek', 'mealType'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateEntryDto();
        dto.weekStart = requireStringArg(args, 'weekStart');
        dto.dayOfWeek = requireNumberArg(args, 'dayOfWeek');
        dto.mealType = requireStringArg(args, 'mealType') as MealType;
        const custom = new CustomMealDto();
        custom.title = requireStringArg(args, 'title');
        custom.ingredients = parseIngredients(args);
        dto.custom = custom;
        const participants = parseParticipants(args);
        if (participants) {
          dto.participants = participants;
        }
        return mealService.addEntry(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'set_meal_participants',
      description:
        'Ustawia, kto je zaplanowany posiłek i w ilu porcjach (0,5 = pół porcji, 2 = dokładka). ' +
        'Zastępuje dotychczasową listę; pusta lista = posiłek nieprzypisany (poza bilansem). ' +
        'Wymaga entryId. userId weź z list_household_members.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          entryId: { type: 'string', description: 'ID wpisu w planerze' },
          participants: participantsSchema,
        },
        required: ['entryId', 'participants'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return mealService.setParticipants(
          requireStringArg(args, 'entryId'),
          ctx.userId,
          parseParticipants(args) ?? [],
        );
      },
    },
    {
      name: 'adjust_meal_entry',
      description:
        'Koryguje zaplanowany posiłek bez zmieniania przepisu: portionScale (mnożnik porcji, np. 2 = podwójna) ' +
        'i/lub overrides (bezwzględne ilości wybranych składników, np. 4 jajka zamiast 2). Korekty wchodzą do ' +
        'zakupów, spiżarni i makro tego posiłku. portionScale=1 i overrides=[] przywracają przepis. Wymaga entryId.',
      requiredScopes: ['meals:write'],
      inputSchema: {
        type: 'object',
        properties: {
          entryId: { type: 'string', description: 'ID wpisu w planerze' },
          portionScale: { type: 'number', description: 'Mnożnik porcji (0.25–10), np. 2 = podwójna porcja' },
          overrides: {
            type: 'array',
            description: 'Bezwzględne ilości wybranych składników: [{ingredientId, quantity}]',
            items: {
              type: 'object',
              properties: {
                ingredientId: { type: 'string', description: 'ingredientId ze składnika przepisu (get_recipe)' },
                quantity: { type: 'number', description: 'Nowa ilość w jednostce składnika' },
              },
              required: ['ingredientId', 'quantity'],
              additionalProperties: false,
            },
          },
        },
        required: ['entryId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const dto = new AdjustEntryDto();
        const portionScale = numberArg(args, 'portionScale');
        if (portionScale !== undefined) {
          dto.portionScale = portionScale;
        }
        if (Array.isArray(args.overrides)) {
          dto.ingredientOverrides = args.overrides
            .filter((o): o is Record<string, unknown> => typeof o === 'object' && o !== null)
            .map((raw) => {
              const override = new IngredientOverrideDto();
              override.ingredientId = requireStringArg(raw, 'ingredientId');
              override.quantity = requireNumberArg(raw, 'quantity');
              return override;
            });
        }
        return mealService.adjustEntry(requireStringArg(args, 'entryId'), ctx.userId, dto);
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

const participantsSchema = {
  type: 'array',
  description: 'Kto je ten posiłek: [{userId, portions}]. Porcje jako mnożnik porcji przepisu.',
  items: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'ID domownika (z list_household_members)' },
      portions: { type: 'number', description: 'Liczba porcji, np. 0.5 / 1 / 2' },
    },
    required: ['userId', 'portions'],
    additionalProperties: false,
  },
} as const;

// Zwraca undefined, gdy klucz nie został w ogóle podany — inaczej nie dałoby się
// odróżnić „nie ruszaj uczestników" od „wyczyść listę".
function parseParticipants(args: Record<string, unknown>): MealParticipantDto[] | undefined {
  if (!Array.isArray(args.participants)) {
    return undefined;
  }
  return args.participants
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((raw) => {
      const dto = new MealParticipantDto();
      dto.userId = requireStringArg(raw, 'userId');
      dto.portions = numberArg(raw, 'portions') ?? 1;
      return dto;
    });
}

// Wartości na 100 g / 100 ml, a dla produktów w `szt` — na 1 sztukę.
const nutritionSchema = {
  type: 'object',
  description: 'Wartości odżywcze na 100 g / 100 ml (dla baseUnit „szt" — na 1 sztukę)',
  properties: {
    kcal: { type: 'number', description: 'Energia (kcal)' },
    protein: { type: 'number', description: 'Białko (g)' },
    fat: { type: 'number', description: 'Tłuszcz (g)' },
    carbs: { type: 'number', description: 'Węglowodany (g)' },
    fiber: { type: 'number', description: 'Błonnik (g, opcjonalnie)' },
    salt: { type: 'number', description: 'Sól (g, opcjonalnie)' },
  },
  required: ['kcal', 'protein', 'fat', 'carbs'],
  additionalProperties: false,
} as const;

function buildProductDto(args: Record<string, unknown>): CreateProductDto {
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
  const nutrition = args.nutrition;
  if (typeof nutrition === 'object' && nutrition !== null) {
    const raw = nutrition as Record<string, unknown>;
    const dtoNutrition = new NutritionDto();
    dtoNutrition.kcal = requireNumberArg(raw, 'kcal');
    dtoNutrition.protein = requireNumberArg(raw, 'protein');
    dtoNutrition.fat = requireNumberArg(raw, 'fat');
    dtoNutrition.carbs = requireNumberArg(raw, 'carbs');
    const fiber = numberArg(raw, 'fiber');
    if (fiber !== undefined) {
      dtoNutrition.fiber = fiber;
    }
    const salt = numberArg(raw, 'salt');
    if (salt !== undefined) {
      dtoNutrition.salt = salt;
    }
    dto.nutrition = dtoNutrition;
  }
  return dto;
}

function buildRecipeDto(args: Record<string, unknown>): CreateRecipeDto {
  const dto = new CreateRecipeDto();
  dto.title = requireStringArg(args, 'title');
  dto.instructions = requireStringArg(args, 'instructions');
  const category = stringArg(args, 'category');
  if (category) {
    dto.category = category;
  }
  const description = stringArg(args, 'description');
  if (description) {
    dto.description = description;
  }
  const servings = numberArg(args, 'servings');
  if (servings !== undefined) {
    dto.servings = servings;
  }
  const ingredients = parseIngredients(args);
  if (ingredients) {
    dto.recipeIngredients = ingredients;
  }
  return dto;
}

function parseIngredients(args: Record<string, unknown>): RecipeIngredientDto[] | undefined {
  if (!Array.isArray(args.ingredients)) {
    return undefined;
  }
  return args.ingredients
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
