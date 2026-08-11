import { AuthorizationCode } from './authorization-code.model';

export abstract class AuthorizationCodeRepositoryPort {
  abstract save(code: AuthorizationCode): Promise<void>;
  abstract findByHash(codeHash: string): Promise<AuthorizationCode | null>;
}
