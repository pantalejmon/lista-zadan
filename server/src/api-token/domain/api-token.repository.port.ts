import { ApiToken } from './api-token.model';

export abstract class ApiTokenRepositoryPort {
  abstract findByUser(userId: string): Promise<ApiToken[]>;
  abstract findById(id: string): Promise<ApiToken | null>;
  abstract findByHash(tokenHash: string): Promise<ApiToken | null>;
  abstract save(token: ApiToken): Promise<void>;
}
