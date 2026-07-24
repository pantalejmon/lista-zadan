import { TodoService } from '../../../todo/domain/todo.service';
import { SharingService } from '../../../sharing/domain/sharing.service';
import { CreateTodoDto } from '../../../todo/web/dto/create-todo.dto';
import { UpdateTodoDto } from '../../../todo/web/dto/update-todo.dto';
import { McpTool, requireStringArg, stringArg } from '../mcp-tool';

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
  ];
}
