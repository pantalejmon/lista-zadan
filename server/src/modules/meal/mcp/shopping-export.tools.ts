import { randomUUID } from 'crypto';
import { MealService } from '../domain/meal.service';
import { TodoService } from '@modules/todo/domain/todo.service';
import { CreateTodoDto } from '@modules/todo/web/dto/create-todo.dto';
import { UpdateTodoDto } from '@modules/todo/web/dto/update-todo.dto';
import { McpTool, stringArg, requireStringArg, boolArg } from '@platform/mcp/domain/mcp-tool';

// Eksport listy zakupów Posiłków do listy zadań. Zdolność należy do Posiłków
// (opisana w `docs/meals.md`), a Zadania są tu tylko celem zapisu — stąd
// wstrzyknięty **publiczny serwis** obcego modułu, nigdy jego repozytorium.
//
// Osobny plik od `meal.tools.ts`, bo to jedyne narzędzie Posiłków sięgające
// poza własny moduł — widać to po samej liście zależności na górze pliku.
export function buildShoppingExportTools(
  mealService: MealService,
  todoService: TodoService,
): McpTool[] {
  return [
    {
      name: 'export_shopping_to_list',
      description:
        'Eksportuje listę zakupów posiłków do wskazanej listy zadań jako jedno zadanie zakupowe. ' +
        'Wymaga listId. Domyślnie tylko niekupione pozycje (onlyUnchecked=true). ' +
        'Opcjonalnie date (YYYY-MM-DD) przypina zadanie do dnia; bez daty trafia do „Luźne".',
      // Cross-module: reads meal shopping AND writes a todo.
      requiredScopes: ['meals:read', 'todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
          listId: { type: 'string', description: 'ID docelowej listy zadań' },
          onlyUnchecked: { type: 'boolean', description: 'Tylko niekupione (domyślnie true)' },
          date: { type: 'string', description: 'Termin YYYY-MM-DD (opcjonalnie; bez niego → Luźne)' },
        },
        required: ['listId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const listId = requireStringArg(args, 'listId');
        const onlyUnchecked = boolArg(args, 'onlyUnchecked') ?? true;
        const date = stringArg(args, 'date');

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
        if (date) {
          createDto.date = date;
        } else {
          createDto.month = now.toISOString().slice(0, 7);
        }
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
    }
,
  ];
}
