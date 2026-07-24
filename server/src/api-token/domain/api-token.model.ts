import { randomBytes, createHash, randomUUID } from 'crypto';
import { ApiScope } from './api-scope';

export interface ApiTokenResponse {
  id: string;
  name: string;
  scopes: ApiScope[];
  householdId: string | null;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  revokedAt: number | null;
}

// Shown once at creation time — includes the plaintext secret the caller must copy.
export interface ApiTokenCreated extends ApiTokenResponse {
  token: string;
}

const TOKEN_PREFIX = 'lz_';

export class ApiToken {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly name: string,
    readonly tokenHash: string,
    readonly scopes: ApiScope[],
    readonly householdId: string | null,
    readonly createdAt: number,
    readonly expiresAt: number | null,
    readonly lastUsedAt: number | null,
    readonly revokedAt: number | null,
  ) {}

  // Mints a new token, returning both the domain model (with only the hash) and
  // the one-time plaintext secret to hand back to the caller.
  static issue(
    userId: string,
    name: string,
    scopes: ApiScope[],
    householdId: string | null,
    expiresAt: number | null,
  ): { model: ApiToken; secret: string } {
    const secret = `${TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;
    const model = new ApiToken(
      randomUUID(),
      userId,
      name.trim(),
      ApiToken.hash(secret),
      scopes,
      householdId,
      Date.now(),
      expiresAt,
      null,
      null,
    );
    return { model, secret };
  }

  static hash(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  static looksLikeToken(value: string): boolean {
    return value.startsWith(TOKEN_PREFIX);
  }

  isActive(now: number): boolean {
    if (this.revokedAt !== null) {
      return false;
    }
    if (this.expiresAt !== null && this.expiresAt <= now) {
      return false;
    }
    return true;
  }

  withLastUsed(at: number): ApiToken {
    return new ApiToken(
      this.id,
      this.userId,
      this.name,
      this.tokenHash,
      this.scopes,
      this.householdId,
      this.createdAt,
      this.expiresAt,
      at,
      this.revokedAt,
    );
  }

  withRevoked(at: number): ApiToken {
    return new ApiToken(
      this.id,
      this.userId,
      this.name,
      this.tokenHash,
      this.scopes,
      this.householdId,
      this.createdAt,
      this.expiresAt,
      this.lastUsedAt,
      at,
    );
  }

  toResponse(): ApiTokenResponse {
    return {
      id: this.id,
      name: this.name,
      scopes: this.scopes,
      householdId: this.householdId,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      lastUsedAt: this.lastUsedAt,
      revokedAt: this.revokedAt,
    };
  }
}
