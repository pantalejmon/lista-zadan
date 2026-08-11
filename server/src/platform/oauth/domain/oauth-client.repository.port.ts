import { OAuthClient } from './oauth-client.model';

export abstract class OAuthClientRepositoryPort {
  abstract save(client: OAuthClient): Promise<void>;
  abstract findById(clientId: string): Promise<OAuthClient | null>;
}
