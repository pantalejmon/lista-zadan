import { MealService } from '../../../meal/domain/meal.service';
import { McpTool, stringArg } from '../mcp-tool';

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
      requiredScope: 'meals:read',
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return mealService.getRecipes(householdId, ctx.userId);
      },
    },
    {
      name: 'get_week_plan',
      description: 'Zwraca plan posiłków na tydzień. Opcjonalnie week (poniedziałek YYYY-MM-DD); domyślnie bieżący tydzień.',
      requiredScope: 'meals:read',
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
      requiredScope: 'meals:read',
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
      requiredScope: 'meals:read',
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
      requiredScope: 'meals:write',
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
      requiredScope: 'meals:write',
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
  ];
}
