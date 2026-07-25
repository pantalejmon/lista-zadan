import { FinanceService } from '../../../finance/domain/finance.service';
import { CreateWalletDto } from '../../../finance/web/dto/create-wallet.dto';
import { CreateTransactionDto } from '../../../finance/web/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../../finance/web/dto/update-transaction.dto';
import { CreateRecurringDto } from '../../../finance/web/dto/create-recurring.dto';
import { FINANCE_CATEGORIES, RECURRENCE_FREQUENCIES, type RecurrenceFrequency } from '../../../finance/domain/finance-category';
import { McpTool, stringArg, requireStringArg, numberArg, requireNumberArg } from '../mcp-tool';

// Agent tools for the finance module (Finanse): wallets, transactions, recurring
// rules and stats. Household-scoped like meals/home. Sign convention: dodatnia
// kwota = przychód, ujemna = wydatek. Reuses FinanceService, so household-role
// permissions apply exactly as in the UI.
export function buildFinanceTools(financeService: FinanceService): McpTool[] {
  const householdProp = {
    householdId: { type: 'string', description: 'ID gospodarstwa (pomiń, gdy token przypięty)' },
  };

  return [
    {
      name: 'list_wallets',
      description: 'Zwraca portfele gospodarstwa z saldem i liczbą transakcji.',
      requiredScopes: ['finance:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return financeService.getWallets(householdId, ctx.userId);
      },
    },
    {
      name: 'create_wallet',
      description: 'Tworzy portfel. Wymaga name.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, name: { type: 'string', description: 'Nazwa portfela' } },
        required: ['name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateWalletDto();
        dto.name = requireStringArg(args, 'name');
        return financeService.createWallet(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'rename_wallet',
      description: 'Zmienia nazwę portfela. Wymaga walletId i name.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: {
          walletId: { type: 'string', description: 'ID portfela' },
          name: { type: 'string', description: 'Nowa nazwa' },
        },
        required: ['walletId', 'name'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const dto = new CreateWalletDto();
        dto.name = requireStringArg(args, 'name');
        return financeService.updateWallet(requireStringArg(args, 'walletId'), ctx.userId, dto);
      },
    },
    {
      name: 'delete_wallet',
      description: 'Usuwa portfel wraz z jego transakcjami i regułami cyklicznymi. Wymaga walletId.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: { walletId: { type: 'string', description: 'ID portfela' } },
        required: ['walletId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await financeService.deleteWallet(requireStringArg(args, 'walletId'), ctx.userId);
        return { deleted: true };
      },
    },
    {
      name: 'list_transactions',
      description: 'Zwraca transakcje gospodarstwa (opcjonalnie tylko z jednego portfela: walletId).',
      requiredScopes: ['finance:read'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, walletId: { type: 'string', description: 'Opcjonalny filtr portfela' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return financeService.getTransactions(householdId, ctx.userId, stringArg(args, 'walletId'));
      },
    },
    {
      name: 'add_transaction',
      description:
        'Dodaje transakcję. Wymaga walletId, amount (dodatnia = przychód, ujemna = wydatek; ≠ 0) i description. ' +
        'Opcjonalnie category oraz occurredAt (epoch ms; domyślnie teraz).',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          walletId: { type: 'string', description: 'ID portfela' },
          amount: { type: 'number', description: 'Kwota: dodatnia = przychód, ujemna = wydatek' },
          description: { type: 'string', description: 'Opis' },
          category: { type: 'string', description: 'Kategoria (opcjonalnie)' },
          occurredAt: { type: 'number', description: 'Data (epoch ms, opcjonalnie)' },
        },
        required: ['walletId', 'amount', 'description'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        const dto = new CreateTransactionDto();
        dto.walletId = requireStringArg(args, 'walletId');
        dto.amount = requireNumberArg(args, 'amount');
        dto.description = requireStringArg(args, 'description');
        const category = stringArg(args, 'category');
        if (category) {
          dto.category = category;
        }
        const occurredAt = numberArg(args, 'occurredAt');
        if (occurredAt !== undefined) {
          dto.occurredAt = occurredAt;
        }
        return financeService.createTransaction(householdId, ctx.userId, dto);
      },
    },
    {
      name: 'update_transaction',
      description:
        'Aktualizuje transakcję (częściowo). Wymaga transactionId. Opcjonalnie amount (≠ 0), description, category, occurredAt.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', description: 'ID transakcji' },
          amount: { type: 'number', description: 'Nowa kwota (≠ 0)' },
          description: { type: 'string', description: 'Nowy opis' },
          category: { type: 'string', description: 'Nowa kategoria' },
          occurredAt: { type: 'number', description: 'Nowa data (epoch ms)' },
        },
        required: ['transactionId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const dto = new UpdateTransactionDto();
        const amount = numberArg(args, 'amount');
        if (amount !== undefined) {
          dto.amount = amount;
        }
        const description = stringArg(args, 'description');
        if (description) {
          dto.description = description;
        }
        const category = stringArg(args, 'category');
        if (category) {
          dto.category = category;
        }
        const occurredAt = numberArg(args, 'occurredAt');
        if (occurredAt !== undefined) {
          dto.occurredAt = occurredAt;
        }
        return financeService.updateTransaction(requireStringArg(args, 'transactionId'), ctx.userId, dto);
      },
    },
    {
      name: 'delete_transaction',
      description: 'Usuwa transakcję. Wymaga transactionId.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: { transactionId: { type: 'string', description: 'ID transakcji' } },
        required: ['transactionId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await financeService.deleteTransaction(requireStringArg(args, 'transactionId'), ctx.userId);
        return { deleted: true };
      },
    },
    {
      name: 'list_recurring_transactions',
      description: 'Zwraca reguły cyklicznych transakcji gospodarstwa.',
      requiredScopes: ['finance:read'],
      inputSchema: { type: 'object', properties: { ...householdProp }, additionalProperties: false },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return financeService.getRecurring(householdId, ctx.userId);
      },
    },
    {
      name: 'add_recurring_transaction',
      description:
        'Dodaje regułę cyklicznej transakcji. Wymaga walletId, amount (≠ 0), description i frequency (daily/weekly/monthly). ' +
        'Opcjonalnie category oraz nextDueAt (YYYY-MM-DD; domyślnie jutro).',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: {
          ...householdProp,
          walletId: { type: 'string', description: 'ID portfela' },
          amount: { type: 'number', description: 'Kwota (dodatnia/ujemna, ≠ 0)' },
          description: { type: 'string', description: 'Opis' },
          category: { type: 'string', description: 'Kategoria (opcjonalnie)' },
          frequency: { type: 'string', enum: [...RECURRENCE_FREQUENCIES], description: 'Częstotliwość' },
          nextDueAt: { type: 'string', description: 'Najbliższy termin YYYY-MM-DD' },
        },
        required: ['walletId', 'amount', 'description', 'frequency'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return financeService.createRecurring(householdId, ctx.userId, buildRecurringDto(args));
      },
    },
    {
      name: 'update_recurring_transaction',
      description:
        'Aktualizuje regułę cykliczną (pełny zestaw pól). Wymaga recurringId, walletId, amount, description, frequency. ' +
        'Opcjonalnie category, nextDueAt.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: {
          recurringId: { type: 'string', description: 'ID reguły' },
          walletId: { type: 'string', description: 'ID portfela' },
          amount: { type: 'number', description: 'Kwota (≠ 0)' },
          description: { type: 'string', description: 'Opis' },
          category: { type: 'string', description: 'Kategoria (opcjonalnie)' },
          frequency: { type: 'string', enum: [...RECURRENCE_FREQUENCIES], description: 'Częstotliwość' },
          nextDueAt: { type: 'string', description: 'Najbliższy termin YYYY-MM-DD' },
        },
        required: ['recurringId', 'walletId', 'amount', 'description', 'frequency'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        return financeService.updateRecurring(requireStringArg(args, 'recurringId'), ctx.userId, buildRecurringDto(args));
      },
    },
    {
      name: 'delete_recurring_transaction',
      description: 'Usuwa regułę cykliczną. Wymaga recurringId.',
      requiredScopes: ['finance:write'],
      inputSchema: {
        type: 'object',
        properties: { recurringId: { type: 'string', description: 'ID reguły' } },
        required: ['recurringId'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        await financeService.deleteRecurring(requireStringArg(args, 'recurringId'), ctx.userId);
        return { deleted: true };
      },
    },
    {
      name: 'get_finance_stats',
      description:
        'Zwraca statystyki finansów: przychody, wydatki, saldo, rozbicie na kategorie i trend. ' +
        'Opcjonalnie walletId (jeden portfel).',
      requiredScopes: ['finance:read'],
      inputSchema: {
        type: 'object',
        properties: { ...householdProp, walletId: { type: 'string', description: 'Opcjonalny portfel' } },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const householdId = ctx.requireHousehold(stringArg(args, 'householdId'));
        return financeService.getStats(householdId, ctx.userId, stringArg(args, 'walletId'));
      },
    },
    {
      name: 'list_finance_categories',
      description: 'Zwraca sugerowane kategorie transakcji (podpowiedzi, kategoria jest dowolna).',
      requiredScopes: ['finance:read'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => {
        return { categories: [...FINANCE_CATEGORIES] };
      },
    },
  ];
}

function buildRecurringDto(args: Record<string, unknown>): CreateRecurringDto {
  const dto = new CreateRecurringDto();
  dto.walletId = requireStringArg(args, 'walletId');
  dto.amount = requireNumberArg(args, 'amount');
  dto.description = requireStringArg(args, 'description');
  dto.frequency = requireStringArg(args, 'frequency') as RecurrenceFrequency;
  const category = stringArg(args, 'category');
  if (category) {
    dto.category = category;
  }
  const nextDueAt = stringArg(args, 'nextDueAt');
  if (nextDueAt) {
    dto.nextDueAt = nextDueAt;
  }
  return dto;
}
