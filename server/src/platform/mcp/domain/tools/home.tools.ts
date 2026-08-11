import { HomeService } from '@modules/home/domain/home.service';
import { CreateAssetDto } from '@modules/home/web/dto/create-asset.dto';
import { CreateMaintenanceDto } from '@modules/home/web/dto/create-maintenance.dto';
import { CompleteMaintenanceDto } from '@modules/home/web/dto/complete-maintenance.dto';
import { CreateProviderDto } from '@modules/home/web/dto/create-provider.dto';
import { CreateRenovationDto, ChecklistItemDto } from '@modules/home/web/dto/create-renovation.dto';
import { McpTool, stringArg, requireStringArg, numberArg, boolArg } from '../mcp-tool';

// Agent tools for the home-service module (#46): assets and cyclic maintenance.
export function buildHomeTools(homeService: HomeService): McpTool[] {
  const householdProp = {
    householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
  };

  return [
    {
      name: 'list_home_assets',
      description:
        'Zwraca instalacje/urządzenia domu z ich przeglądami (terminy, statusy: po terminie / zbliża się / aktualny).',
      requiredScopes: ['home:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return homeService.getAssets(householdId, ctx.userId);
      },
    },
    {
      name: 'add_home_asset',
      description: 'Dodaje instalację/urządzenie. Wymaga name i type (np. piec, klimatyzacja, komin).',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          name: { type: 'string', description: 'Nazwa (np. „Piec gazowy")' },
          type: { type: 'string', description: 'Typ (piec, elektryka, klimatyzacja, komin, PV…)' },
          location: { type: 'string', description: 'Lokalizacja' },
          warrantyUntil: { type: 'string', description: 'Gwarancja do (YYYY-MM-DD)' },
          model: { type: 'string', description: 'Model' },
        },
        required: ['name', 'type'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateAssetDto();
        dto.name = requireStringArg(args, 'name');
        dto.type = requireStringArg(args, 'type');
        const location = stringArg(args, 'location');
        if (location) {
          dto.location = location;
        }
        const warrantyUntil = stringArg(args, 'warrantyUntil');
        if (warrantyUntil) {
          dto.warrantyUntil = warrantyUntil;
        }
        const model = stringArg(args, 'model');
        if (model) {
          dto.model = model;
        }
        return homeService.createAsset(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'add_maintenance',
      description:
        'Dodaje przegląd/serwis do instalacji. Wymaga assetId i type. Opcjonalnie intervalMonths (cykl), ' +
        'lastDoneAt/nextDueAt (YYYY-MM-DD). Bez nextDueAt liczony z lastDoneAt + interwał.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          assetId: { type: 'string', description: 'ID instalacji' },
          type: { type: 'string', description: 'Rodzaj (np. „Przegląd gazowy")' },
          intervalMonths: { type: 'number', description: 'Cykl w miesiącach (pomiń = jednorazowy)' },
          lastDoneAt: { type: 'string', description: 'Ostatnio wykonano YYYY-MM-DD' },
          nextDueAt: { type: 'string', description: 'Następny termin YYYY-MM-DD' },
        },
        required: ['assetId', 'type'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateMaintenanceDto();
        dto.assetId = requireStringArg(args, 'assetId');
        dto.type = requireStringArg(args, 'type');
        const interval = numberArg(args, 'intervalMonths');
        if (interval !== undefined) {
          dto.intervalMonths = interval;
        }
        const lastDoneAt = stringArg(args, 'lastDoneAt');
        if (lastDoneAt) {
          dto.lastDoneAt = lastDoneAt;
        }
        const nextDueAt = stringArg(args, 'nextDueAt');
        if (nextDueAt) {
          dto.nextDueAt = nextDueAt;
        }
        return homeService.createMaintenance(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'complete_maintenance',
      description:
        'Oznacza przegląd jako wykonany. Wymaga maintenanceId. Opcjonalnie doneAt (YYYY-MM-DD, domyślnie dziś) i cost. ' +
        'Następny termin przeliczy się z interwału.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: {
          maintenanceId: { type: 'string', description: 'ID przeglądu' },
          doneAt: { type: 'string', description: 'Data wykonania YYYY-MM-DD' },
          cost: { type: 'number', description: 'Koszt (zł)' },
        },
        required: ['maintenanceId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const maintenanceId = requireStringArg(args, 'maintenanceId');
        const dto = new CompleteMaintenanceDto();
        const doneAt = stringArg(args, 'doneAt');
        if (doneAt) {
          dto.doneAt = doneAt;
        }
        const cost = numberArg(args, 'cost');
        if (cost !== undefined) {
          dto.cost = cost;
        }
        return homeService.completeMaintenance(maintenanceId, ctx.userId, dto);
      },
    },
    {
      name: 'update_home_asset',
      description:
        'Aktualizuje instalację/urządzenie (pełny zestaw pól). Wymaga assetId, name i type. ' +
        'Opcjonalnie location, installedAt, warrantyUntil (YYYY-MM-DD), model, serial, notes.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: {
          assetId: { type: 'string', description: 'ID instalacji' },
          name: { type: 'string', description: 'Nazwa' },
          type: { type: 'string', description: 'Typ' },
          location: { type: 'string', description: 'Lokalizacja' },
          installedAt: { type: 'string', description: 'Zainstalowano (YYYY-MM-DD)' },
          warrantyUntil: { type: 'string', description: 'Gwarancja do (YYYY-MM-DD)' },
          model: { type: 'string', description: 'Model' },
          serial: { type: 'string', description: 'Numer seryjny' },
          notes: { type: 'string', description: 'Notatki' },
        },
        required: ['assetId', 'name', 'type'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return homeService.updateAsset(requireStringArg(args, 'assetId'), ctx.userId, buildAssetDto(args));
      },
    },
    {
      name: 'delete_home_asset',
      description: 'Usuwa instalację/urządzenie (kaskadowo jego przeglądy). Wymaga assetId.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { assetId: { type: 'string', description: 'ID instalacji' } },
        required: ['assetId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await homeService.deleteAsset(requireStringArg(args, 'assetId'), ctx.userId);
        return { deleted: true };
      },
    },
    {
      name: 'update_maintenance',
      description:
        'Aktualizuje przegląd (pełny zestaw pól). Wymaga maintenanceId, assetId i type. ' +
        'Opcjonalnie intervalMonths, lastDoneAt, nextDueAt (YYYY-MM-DD), cost, notes, providerId.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: {
          maintenanceId: { type: 'string', description: 'ID przeglądu' },
          assetId: { type: 'string', description: 'ID instalacji' },
          type: { type: 'string', description: 'Rodzaj' },
          intervalMonths: { type: 'number', description: 'Cykl w miesiącach' },
          lastDoneAt: { type: 'string', description: 'Ostatnio wykonano YYYY-MM-DD' },
          nextDueAt: { type: 'string', description: 'Następny termin YYYY-MM-DD' },
          cost: { type: 'number', description: 'Koszt (zł)' },
          notes: { type: 'string', description: 'Notatki' },
          providerId: { type: 'string', description: 'ID wykonawcy' },
        },
        required: ['maintenanceId', 'assetId', 'type'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return homeService.updateMaintenance(requireStringArg(args, 'maintenanceId'), ctx.userId, buildMaintenanceDto(args));
      },
    },
    {
      name: 'delete_maintenance',
      description: 'Usuwa przegląd. Wymaga maintenanceId.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { maintenanceId: { type: 'string', description: 'ID przeglądu' } },
        required: ['maintenanceId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await homeService.deleteMaintenance(requireStringArg(args, 'maintenanceId'), ctx.userId);
        return { deleted: true };
      },
    },
    // ---- providers (wykonawcy) ----
    {
      name: 'list_home_providers',
      description: 'Zwraca wykonawców/kontakty serwisowe gospodarstwa.',
      requiredScopes: ['home:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return homeService.getProviders(householdId, ctx.userId);
      },
    },
    {
      name: 'add_home_provider',
      description: 'Dodaje wykonawcę. Wymaga name. Opcjonalnie trade, phone, email, notes.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, ...providerProps },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return homeService.createProvider(householdId, ctx.userId, buildProviderDto(args));
      },
    },
    {
      name: 'update_home_provider',
      description: 'Aktualizuje wykonawcę. Wymaga providerId i name. Opcjonalnie trade, phone, email, notes.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { providerId: { type: 'string', description: 'ID wykonawcy' }, ...providerProps },
        required: ['providerId', 'name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return homeService.updateProvider(requireStringArg(args, 'providerId'), ctx.userId, buildProviderDto(args));
      },
    },
    {
      name: 'delete_home_provider',
      description: 'Usuwa wykonawcę. Wymaga providerId.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { providerId: { type: 'string', description: 'ID wykonawcy' } },
        required: ['providerId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await homeService.deleteProvider(requireStringArg(args, 'providerId'), ctx.userId);
        return { deleted: true };
      },
    },
    // ---- renovations (remonty) ----
    {
      name: 'list_renovations',
      description: 'Zwraca remonty/projekty gospodarstwa (status, budżet, koszt, checklista).',
      requiredScopes: ['home:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return homeService.getRenovations(householdId, ctx.userId);
      },
    },
    {
      name: 'add_renovation',
      description:
        'Dodaje remont. Wymaga title. Opcjonalnie status (planned/in_progress/done), description, budget, cost, ' +
        'checklist (lista {text, done?}).',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, ...renovationProps },
        required: ['title'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return homeService.createRenovation(householdId, ctx.userId, buildRenovationDto(args));
      },
    },
    {
      name: 'update_renovation',
      description:
        'Aktualizuje remont. Wymaga renovationId i title. Opcjonalnie status, description, budget, cost, checklist.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { renovationId: { type: 'string', description: 'ID remontu' }, ...renovationProps },
        required: ['renovationId', 'title'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return homeService.updateRenovation(requireStringArg(args, 'renovationId'), ctx.userId, buildRenovationDto(args));
      },
    },
    {
      name: 'delete_renovation',
      description: 'Usuwa remont. Wymaga renovationId.',
      requiredScopes: ['home:write'],
      inputSchema: {
        type: 'object',
        properties: { renovationId: { type: 'string', description: 'ID remontu' } },
        required: ['renovationId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await homeService.deleteRenovation(requireStringArg(args, 'renovationId'), ctx.userId);
        return { deleted: true };
      },
    },
  ];
}

const providerProps = {
  name: { type: 'string', description: 'Nazwa' },
  trade: { type: 'string', description: 'Branża (np. hydraulik)' },
  phone: { type: 'string', description: 'Telefon' },
  email: { type: 'string', description: 'E-mail' },
  notes: { type: 'string', description: 'Notatki' },
} as const;

const renovationProps = {
  title: { type: 'string', description: 'Tytuł' },
  status: { type: 'string', enum: ['planned', 'in_progress', 'done'], description: 'Status' },
  description: { type: 'string', description: 'Opis' },
  budget: { type: 'number', description: 'Budżet (zł)' },
  cost: { type: 'number', description: 'Koszt (zł)' },
  checklist: {
    type: 'array',
    description: 'Checklista',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        text: { type: 'string', description: 'Pozycja' },
        done: { type: 'boolean', description: 'Zrobione' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
} as const;

function buildAssetDto(args: Record<string, unknown>): CreateAssetDto {
  const dto = new CreateAssetDto();
  dto.name = requireStringArg(args, 'name');
  dto.type = requireStringArg(args, 'type');
  assignStrings(dto, args, ['location', 'installedAt', 'warrantyUntil', 'model', 'serial', 'notes']);
  return dto;
}

function buildMaintenanceDto(args: Record<string, unknown>): CreateMaintenanceDto {
  const dto = new CreateMaintenanceDto();
  dto.assetId = requireStringArg(args, 'assetId');
  dto.type = requireStringArg(args, 'type');
  const interval = numberArg(args, 'intervalMonths');
  if (interval !== undefined) {
    dto.intervalMonths = interval;
  }
  const cost = numberArg(args, 'cost');
  if (cost !== undefined) {
    dto.cost = cost;
  }
  assignStrings(dto, args, ['lastDoneAt', 'nextDueAt', 'notes', 'providerId']);
  return dto;
}

function buildProviderDto(args: Record<string, unknown>): CreateProviderDto {
  const dto = new CreateProviderDto();
  dto.name = requireStringArg(args, 'name');
  assignStrings(dto, args, ['trade', 'phone', 'email', 'notes']);
  return dto;
}

function buildRenovationDto(args: Record<string, unknown>): CreateRenovationDto {
  const dto = new CreateRenovationDto();
  dto.title = requireStringArg(args, 'title');
  assignStrings(dto, args, ['status', 'description']);
  const budget = numberArg(args, 'budget');
  if (budget !== undefined) {
    dto.budget = budget;
  }
  const cost = numberArg(args, 'cost');
  if (cost !== undefined) {
    dto.cost = cost;
  }
  if (Array.isArray(args.checklist)) {
    dto.checklist = args.checklist
      .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
      .map((raw) => {
        const item = new ChecklistItemDto();
        item.text = requireStringArg(raw, 'text');
        const id = stringArg(raw, 'id');
        if (id) {
          item.id = id;
        }
        const done = boolArg(raw, 'done');
        if (done !== undefined) {
          item.done = done;
        }
        return item;
      });
  }
  return dto;
}

// Copies present string args onto a DTO (only when non-empty), keeping the
// per-DTO handlers terse. Keyed by field name shared between arg and DTO.
function assignStrings<T extends object>(dto: T, args: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) {
    const value = stringArg(args, key);
    if (value) {
      (dto as Record<string, unknown>)[key] = value;
    }
  }
}
