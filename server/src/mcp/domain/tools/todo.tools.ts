import { TodoService } from '../../../todo/domain/todo.service';
import { SharingService } from '../../../sharing/domain/sharing.service';
import { CreateTodoDto } from '../../../todo/web/dto/create-todo.dto';
import { UpdateTodoDto } from '../../../todo/web/dto/update-todo.dto';
import { CreateRecurringTodosDto } from '../../../todo/web/dto/create-recurring-todos.dto';
import { McpTool, requireStringArg, stringArg, boolArg } from '../mcp-tool';

// Agent tools for the todo/lists module. Reuses the domain services, so all
// permission checks (household membership, roles) apply exactly as in the UI.
export function buildTodoTools(todoService: TodoService, sharingService: SharingService): McpTool[] {
  return [
    {
      name: 'list_todo_lists',
      description: 'Zwraca listy zadań dostępne dla użytkownika (id, nazwa, gospodarstwo, rola).',
      requiredScopes: ['todo:read'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (_args, ctx) => {
        const lists = await sharingService.getListsForUser(ctx.userId);
        return lists.map((l) => ({
          id: l.id,
          name: l.name,
          householdId: l.householdId,
          householdName: l.householdName,
          role: l.role,
          isDefault: l.isDefault,
        }));
      },
    },
    {
      name: 'list_todos',
      description:
        'Zwraca zadania z listy. Podaj listId. Opcjonalnie date (YYYY-MM-DD) aby ograniczyć do jednego dnia.',
      requiredScopes: ['todo:read'],
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string', description: 'ID listy zadań' },
          date: { type: 'string', description: 'Opcjonalna data YYYY-MM-DD' },
        },
        required: ['listId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const listId = requireStringArg(args, 'listId');
        const date = stringArg(args, 'date');
        return date
          ? todoService.getByDate(date, listId, ctx.userId)
          : todoService.getAll(listId, ctx.userId);
      },
    },
    {
      name: 'add_todo',
      description:
        'Dodaje zadanie do listy. Wymaga listId i text. Opcjonalnie date (YYYY-MM-DD) — bez daty trafia do „luźnych".',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string', description: 'ID listy zadań' },
          text: { type: 'string', description: 'Treść zadania' },
          date: { type: 'string', description: 'Opcjonalna data YYYY-MM-DD' },
          time: { type: 'string', description: 'Opcjonalna godzina HH:mm' },
        },
        required: ['listId', 'text'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const dto = new CreateTodoDto();
        dto.listId = requireStringArg(args, 'listId');
        dto.text = requireStringArg(args, 'text');
        const date = stringArg(args, 'date');
        const time = stringArg(args, 'time');
        if (date) {
          dto.date = date;
        } else {
          // No date → unassigned: needs the month bucket the model expects.
          dto.month = new Date().toISOString().slice(0, 7);
        }
        if (time) {
          dto.time = time;
        }
        return todoService.create(dto, ctx.userId);
      },
    },
    {
      name: 'complete_todo',
      description: 'Oznacza zadanie jako wykonane (lub cofa). Wymaga todoId; completed domyślnie true.',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          todoId: { type: 'string', description: 'ID zadania' },
          completed: { type: 'boolean', description: 'true = wykonane (domyślnie), false = cofnij' },
        },
        required: ['todoId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const todoId = requireStringArg(args, 'todoId');
        const dto = new UpdateTodoDto();
        dto.completed = args.completed === false ? false : true;
        return todoService.update(todoId, dto, ctx.userId);
      },
    },
    {
      name: 'update_todo',
      description:
        'Edytuje zadanie. Wymaga todoId; podaj co najmniej jedno z: text, date (YYYY-MM-DD), time (HH:mm), completed. ' +
        'Aby usunąć datę/godzinę przekaż pusty string.',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          todoId: { type: 'string', description: 'ID zadania' },
          text: { type: 'string', description: 'Nowa treść' },
          date: { type: 'string', description: 'Nowa data YYYY-MM-DD (pusty = usuń)' },
          time: { type: 'string', description: 'Nowa godzina HH:mm (pusty = usuń)' },
          completed: { type: 'boolean', description: 'Stan wykonania' },
        },
        required: ['todoId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const todoId = requireStringArg(args, 'todoId');
        const dto = new UpdateTodoDto();
        const text = stringArg(args, 'text');
        if (text) {
          dto.text = text;
        }
        if (typeof args.date === 'string') {
          dto.date = args.date.trim() || null;
        }
        if (typeof args.time === 'string') {
          dto.time = args.time.trim() || null;
        }
        const completed = boolArg(args, 'completed');
        if (completed !== undefined) {
          dto.completed = completed;
        }
        return todoService.update(todoId, dto, ctx.userId);
      },
    },
    {
      name: 'delete_todo',
      description: 'Usuwa zadanie. Wymaga todoId.',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: { todoId: { type: 'string', description: 'ID zadania' } },
        required: ['todoId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await todoService.delete(requireStringArg(args, 'todoId'), ctx.userId);
        return { deleted: true };
      },
    },
    {
      name: 'list_unassigned_todos',
      description: 'Zwraca zadania bez przypisanej daty („luźne") z danej listy. Wymaga listId.',
      requiredScopes: ['todo:read'],
      inputSchema: {
        type: 'object',
        properties: { listId: { type: 'string', description: 'ID listy zadań' } },
        required: ['listId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return todoService.getUnassigned(requireStringArg(args, 'listId'), ctx.userId);
      },
    },
    {
      name: 'add_recurring_todos',
      description:
        'Tworzy serię cyklicznych zadań. Wymaga listId, text, type (daily/weekly/monthly), dateFrom i dateTo (YYYY-MM-DD). ' +
        'Opcjonalnie time (HH:mm).',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string', description: 'ID listy zadań' },
          text: { type: 'string', description: 'Treść zadania' },
          type: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Cykl' },
          dateFrom: { type: 'string', description: 'Od (YYYY-MM-DD)' },
          dateTo: { type: 'string', description: 'Do (YYYY-MM-DD)' },
          time: { type: 'string', description: 'Godzina HH:mm (opcjonalnie)' },
        },
        required: ['listId', 'text', 'type', 'dateFrom', 'dateTo'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const dto = new CreateRecurringTodosDto();
        dto.listId = requireStringArg(args, 'listId');
        dto.text = requireStringArg(args, 'text');
        dto.type = requireStringArg(args, 'type') as 'daily' | 'weekly' | 'monthly';
        dto.dateFrom = requireStringArg(args, 'dateFrom');
        dto.dateTo = requireStringArg(args, 'dateTo');
        const time = stringArg(args, 'time');
        if (time) {
          dto.time = time;
        }
        return todoService.createRecurring(dto, ctx.userId);
      },
    },
    {
      name: 'delete_recurrence_group',
      description: 'Usuwa całą serię cyklicznych zadań. Wymaga groupId (recurrenceGroupId zadania z serii).',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: { groupId: { type: 'string', description: 'ID grupy cyklu' } },
        required: ['groupId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const groupId = requireStringArg(args, 'groupId');
        // Verifies membership/permission via the list before deleting the whole group.
        await todoService.getListIdForRecurrenceGroup(groupId, ctx.userId);
        await todoService.deleteRecurrenceGroup(groupId, ctx.userId);
        return { deleted: true };
      },
    },
    // ---- todo lists (sharing module) ----
    {
      name: 'create_todo_list',
      description: 'Tworzy nową listę zadań. Wymaga name. Opcjonalnie householdId (domyślnie gospodarstwo domyślne).',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nazwa listy' },
          householdId: { type: 'string', description: 'ID gospodarstwa (opcjonalnie)' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return sharingService.createList(requireStringArg(args, 'name'), ctx.userId, stringArg(args, 'householdId'));
      },
    },
    {
      name: 'rename_todo_list',
      description: 'Zmienia nazwę listy zadań. Wymaga listId i name.',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string', description: 'ID listy' },
          name: { type: 'string', description: 'Nowa nazwa' },
        },
        required: ['listId', 'name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return sharingService.updateList(requireStringArg(args, 'listId'), requireStringArg(args, 'name'), ctx.userId);
      },
    },
    {
      name: 'delete_todo_list',
      description: 'Usuwa listę zadań (nie można usunąć listy domyślnej). Wymaga listId.',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: { listId: { type: 'string', description: 'ID listy' } },
        required: ['listId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await sharingService.deleteList(requireStringArg(args, 'listId'), ctx.userId);
        return { deleted: true };
      },
    },
    {
      name: 'move_todo_list',
      description: 'Przenosi listę (wraz z zadaniami) do innego gospodarstwa. Wymaga listId i householdId (docelowe).',
      requiredScopes: ['todo:write'],
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string', description: 'ID listy' },
          householdId: { type: 'string', description: 'ID docelowego gospodarstwa' },
        },
        required: ['listId', 'householdId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return sharingService.moveList(
          requireStringArg(args, 'listId'),
          requireStringArg(args, 'householdId'),
          ctx.userId,
        );
      },
    },
  ];
}
