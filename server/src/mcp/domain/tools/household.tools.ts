import { randomUUID } from 'crypto';
import { SharingService } from '../../../sharing/domain/sharing.service';
import { MealService } from '../../../meal/domain/meal.service';
import { TodoService } from '../../../todo/domain/todo.service';
import { CreateTodoDto } from '../../../todo/web/dto/create-todo.dto';
import { UpdateTodoDto } from '../../../todo/web/dto/update-todo.dto';
import type { ListRole } from '../../../sharing/domain/list-role';
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
    },
    // ---- household management ----
    {
      name: 'create_household',
      description: 'Tworzy nowe gospodarstwo domowe (tworzący zostaje właścicielem). Wymaga name.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Nazwa gospodarstwa' } },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return sharingService.createHousehold(requireStringArg(args, 'name'), ctx.userId);
      },
    },
    {
      name: 'rename_household',
      description: 'Zmienia nazwę gospodarstwa (tylko właściciel). Wymaga householdId i name.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: {
          householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
          name: { type: 'string', description: 'Nowa nazwa' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return sharingService.renameHousehold(householdId, requireStringArg(args, 'name'), ctx.userId);
      },
    },
    {
      name: 'list_household_members',
      description: 'Zwraca członków gospodarstwa (id, email, nazwa, rola).',
      requiredScopes: ['households:read'],
      inputSchema: {
        type: 'object',
        properties: { householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return sharingService.getHouseholdMembers(householdId, ctx.userId);
      },
    },
    {
      name: 'invite_to_household',
      description:
        'Zaprasza osobę do gospodarstwa mailem. Wymaga email i role (editor lub viewer). ' +
        'Do nadania roli owner użyj change_member_role po dołączeniu.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: {
          householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
          email: { type: 'string', description: 'E-mail zapraszanej osoby' },
          role: { type: 'string', enum: ['editor', 'viewer'], description: 'Rola' },
        },
        required: ['email', 'role'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const role = requireStringArg(args, 'role') as ListRole;
        return sharingService.inviteToHousehold(householdId, requireStringArg(args, 'email'), role, ctx.userId);
      },
    },
    {
      name: 'change_member_role',
      description: 'Zmienia rolę członka gospodarstwa (tylko właściciel). Wymaga memberId i role (owner/editor/viewer).',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: {
          householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
          memberId: { type: 'string', description: 'ID członka (z list_household_members)' },
          role: { type: 'string', enum: ['owner', 'editor', 'viewer'], description: 'Nowa rola' },
        },
        required: ['memberId', 'role'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const role = requireStringArg(args, 'role') as ListRole;
        return sharingService.changeMemberRole(householdId, requireStringArg(args, 'memberId'), role, ctx.userId);
      },
    },
    {
      name: 'remove_household_member',
      description: 'Usuwa członka z gospodarstwa (tylko właściciel). Wymaga memberId.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: {
          householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
          memberId: { type: 'string', description: 'ID członka' },
        },
        required: ['memberId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        await sharingService.removeMember(householdId, requireStringArg(args, 'memberId'), ctx.userId);
        return { removed: true };
      },
    },
    {
      name: 'leave_household',
      description: 'Opuszcza gospodarstwo (bieżący użytkownik). Wymaga householdId.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: { householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        await sharingService.leaveHousehold(householdId, ctx.userId);
        return { left: true };
      },
    },
    {
      name: 'list_contacts',
      description: 'Zwraca osoby dzielące z użytkownikiem jakiekolwiek gospodarstwo (podpowiedzi do zaproszeń).',
      requiredScopes: ['households:read'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (_args, ctx) => {
        return sharingService.getContactSuggestions(ctx.userId);
      },
    },
    {
      name: 'list_pending_invitations',
      description: 'Zwraca zaproszenia do gospodarstw oczekujące dla bieżącego użytkownika.',
      requiredScopes: ['households:read'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (_args, ctx) => {
        return sharingService.getPendingInvitations(ctx.email);
      },
    },
    {
      name: 'accept_invitation',
      description: 'Akceptuje zaproszenie do gospodarstwa. Wymaga invitationId.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: { invitationId: { type: 'string', description: 'ID zaproszenia' } },
        required: ['invitationId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await sharingService.acceptInvitation(requireStringArg(args, 'invitationId'), ctx.userId, ctx.email);
        return { accepted: true };
      },
    },
    {
      name: 'decline_invitation',
      description: 'Odrzuca zaproszenie do gospodarstwa. Wymaga invitationId.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: { invitationId: { type: 'string', description: 'ID zaproszenia' } },
        required: ['invitationId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await sharingService.declineInvitation(requireStringArg(args, 'invitationId'), ctx.email);
        return { declined: true };
      },
    },
  ];
}
