import { HomeService } from '../../../home/domain/home.service';
import { CreateAssetDto } from '../../../home/web/dto/create-asset.dto';
import { CreateMaintenanceDto } from '../../../home/web/dto/create-maintenance.dto';
import { CompleteMaintenanceDto } from '../../../home/web/dto/complete-maintenance.dto';
import { McpTool, stringArg, requireStringArg } from '../mcp-tool';

function numberArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

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
  ];
}
