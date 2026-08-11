import { ForbiddenException } from '@nestjs/common';
import { TodoService } from './todo.service';
import { Todo } from './todo.model';
import type { TodoRepositoryPort } from './todo.repository.port';
import type { SharingService } from '@platform/sharing/domain/sharing.service';
import type { UserRepositoryPort } from '@platform/auth/domain/user.repository.port';
import type { TodosGateway } from '../web/todos.gateway';
import type { ConfigService } from '@nestjs/config';
import type { SyncOperationDto } from '../web/dto/sync-todos.dto';

// Kolejka offline żyje w IndexedDB i przeżywa przeinstalowanie PWA, więc jedna
// operacja, której nie da się zapisać, blokowała synchronizację **na zawsze**:
// całe żądanie wywalało się na pierwszym wyjątku, klient nie czyścił kolejki
// i wysyłał tę samą paczkę co 2 sekundy (#119).
//
// Te testy pilnują, że batch nie jest transakcją: zepsuta operacja jest
// odrzucana pojedynczo, a zdrowe obok niej przechodzą.

const USER = 'user-1';
const MY_LIST = 'lista-moja';
const LOST_LIST = 'lista-utracona';

interface OpOverrides {
  type?: SyncOperationDto['type'];
  timestamp?: number;
  todo: Partial<SyncOperationDto['todo']>;
}

function op({ type = 'create', timestamp = 1000, todo }: OpOverrides): SyncOperationDto {
  return {
    type,
    timestamp,
    todo: {
      id: 'todo-1',
      text: 'Kup mleko',
      completed: false,
      createdAt: 1000,
      listId: MY_LIST,
      ...todo,
    },
  } as SyncOperationDto;
}

function buildService(): { service: TodoService; saved: Todo[] } {
  const saved: Todo[] = [];

  const repository = {
    findById: async (id: string) => saved.find((t) => t.id === id) ?? null,
    save: async (todo: Todo) => { saved.push(todo); },
    update: async (todo: Todo) => {
      const i = saved.findIndex((t) => t.id === todo.id);
      saved[i] = todo;
    },
    delete: async (id: string) => {
      const i = saved.findIndex((t) => t.id === id);
      if (i >= 0) { saved.splice(i, 1); }
    },
  } as unknown as TodoRepositoryPort;

  // Użytkownik stracił dostęp do jednej z list — dokładnie ten przypadek zatruwał kolejkę.
  const sharingService = {
    assertPermission: async (listId: string) => {
      if (listId !== MY_LIST) {
        throw new ForbiddenException('Insufficient permissions for this list');
      }
    },
  } as unknown as SharingService;

  const userRepository = {
    findById: async () => ({ usedStorageBytes: 0 }),
    addStorageUsed: async () => undefined,
  } as unknown as UserRepositoryPort;

  const configService = { get: <T>(_k: string, d: T) => d } as unknown as ConfigService;
  const gateway = { notifyChanged: () => undefined, notifyRecurrenceDeleted: () => undefined } as unknown as TodosGateway;

  return { service: new TodoService(repository, sharingService, userRepository, configService, gateway), saved };
}

describe('TodoService.syncOperations — kolejka nie do zatrucia', () => {
  it('odrzuca operację na utraconej liście, ale zapisuje zdrowe obok niej', async () => {
    const { service, saved } = buildService();

    const results = await service.syncOperations([
      op({ todo: { id: 'a', text: 'Zdrowe przed', listId: MY_LIST } }),
      op({ todo: { id: 'b', text: 'Zatruwacz', listId: LOST_LIST } }),
      op({ todo: { id: 'c', text: 'Zdrowe po', listId: MY_LIST } }),
    ], USER);

    expect(results.map((r) => r.status)).toEqual(['applied', 'rejected', 'applied']);
    // Kluczowe: operacja PO zepsutej też przeszła — wcześniej wyjątek przerywał pętlę.
    expect(saved.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('odrzucenie niesie powód zrozumiały dla użytkownika, nie kod HTTP', async () => {
    const { service } = buildService();

    const [result] = await service.syncOperations(
      [op({ todo: { id: 'b', listId: LOST_LIST } })],
      USER,
    );

    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('Brak dostępu do listy');
  });

  it('odrzuca operację z pustym listId zamiast wywalać całe żądanie', async () => {
    const { service, saved } = buildService();

    // Klient wysyłał `listId: ''` dla edycji zadania bez listy. Walidacja DTO
    // odrzucała wtedy **całą** paczkę na 400, więc reszta nigdy nie docierała.
    const results = await service.syncOperations([
      op({ type: 'update', todo: { id: 'x', listId: '' } }),
      op({ todo: { id: 'y', text: 'Zdrowe', listId: MY_LIST } }),
    ], USER);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'applied']);
    expect(saved.map((t) => t.id)).toEqual(['y']);
  });

  it('błąd przejściowy zostaje do ponowienia, a nie kasuje zmiany użytkownika', async () => {
    const { service } = buildService();
    // Awaria bazy to nie powód, żeby wyrzucić czyjąś zmianę z kolejki.
    jest.spyOn(service as unknown as { applyOperation: () => Promise<void> }, 'applyOperation')
      .mockRejectedValueOnce(new Error('SQLITE_BUSY'));

    const [result] = await service.syncOperations([op({ todo: { id: 'z' } })], USER);

    expect(result.status).toBe('failed');
  });
});
