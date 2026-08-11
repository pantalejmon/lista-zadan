import { SharingService } from '../domain/sharing.service';
import type { ListRole } from '../domain/list-role';
import { McpTool, stringArg, requireStringArg } from '@platform/mcp/domain/mcp-tool';

// Narzędzia gospodarstw (#35): lista gospodarstw, zarządzanie członkami
// i zaproszeniami. Wyłącznie `SharingService` — eksport zakupów do zadań, jako
// jedyne narzędzie sięgające po Posiłki i Zadania, mieszka w module Posiłków.
export function buildHouseholdTools(sharingService: SharingService): McpTool[] {
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
      name: 'setup_household',
      description:
        'Zakłada gospodarstwo przy pierwszym uruchomieniu: tworzy je razem z domyślną listą zadań. ' +
        'Dla kolejnych gospodarstw używaj create_household. Wymaga name.',
      requiredScopes: ['households:write'],
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Nazwa gospodarstwa' } },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return sharingService.setupHousehold(requireStringArg(args, 'name'), ctx.userId);
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
