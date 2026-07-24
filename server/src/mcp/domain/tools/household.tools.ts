import { randomUUID } from 'crypto';
import { SharingService } from '../../../sharing/domain/sharing.service';
import { MealService } from '../../../meal/domain/meal.service';
import { TodoService } from '../../../todo/domain/todo.service';
import { CreateTodoDto } from '../../../todo/web/dto/create-todo.dto';
import { UpdateTodoDto } from '../../../todo/web/dto/update-todo.dto';
import { McpTool, stringArg, requireStringArg, boolArg } from '../mcp-tool';

// Household-level tools (#35): list households and export the meal shopping list
// to a concrete todo list (e.g. a specific member's list).
export function buildHouseholdTools(
  sharingService: SharingService,
  mealService: MealService,
  todoService: TodoService,
): McpTool[] {
  return [
    {
      name: 'list_households',
      description: 'Zwraca gospodarstwa domowe użytkownika (id, nazwa, rola).',
      requiredScopes: ['households:read'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (_args, ctx) => {
        return sharingService.getHouseholds(ctx.userId);
      },
    },
    {
      name: 'export_shopping_to_list',
      description:
        'Eksportuje listę zakupów posiłków do wskazanej listy zadań jako jedno zadanie zakupowe. ' +
        'Wymaga listId. Domyślnie tylko niekupione pozycje (onlyUnchecked=true).',
      // Cross-module: reads meal shopping AND writes a todo.
      requiredScopes: ['meals:read', 'todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
          listId: { type: 'string', description: 'ID docelowej listy zadań' },
          onlyUnchecked: { type: 'boolean', description: 'Tylko niekupione (domyślnie true)' },
        },
        required: ['listId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const listId = requireStringArg(args, 'listId');
        const onlyUnchecked = boolArg(args, 'onlyUnchecked') ?? true;

        const shopping = await mealService.getShopping(householdId, ctx.userId);
        const source = onlyUnchecked ? shopping.filter((s) => !s.isChecked) : shopping;
        if (source.length === 0) {
          return { created: false, reason: 'Lista zakupów posiłków jest pusta.' };
        }

        const now = new Date();
        const dateLabel = `${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
        const createDto = new CreateTodoDto();
        createDto.listId = listId;
        createDto.text = `Zakupy z posiłków (${dateLabel})`;
        createDto.kind = 'shopping';
        const todo = await todoService.create(createDto, ctx.userId);

        const updateDto = new UpdateTodoDto();
        updateDto.items = source.map((item, index) => ({
          id: randomUUID(),
          text: `${item.name}${item.quantity ? ` – ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}`,
          checked: false,
          order: index,
        }));
        const saved = await todoService.update(todo.id, updateDto, ctx.userId);
        return { created: true, todoId: saved.id, itemCount: updateDto.items.length, listId };
      },
    },
  ];
}
