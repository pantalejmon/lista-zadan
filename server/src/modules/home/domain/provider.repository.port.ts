import { Provider } from './provider.model';

export abstract class ProviderRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Provider[]>;
  abstract findById(id: string): Promise<Provider | null>;
  abstract save(provider: Provider): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
