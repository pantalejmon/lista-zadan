import { randomBytes, createHash } from 'crypto';
import { ApiScope } from '@platform/api-token/domain/api-scope';

const CODE_TTL_MS = 5 * 60 * 1000;

// A one-time authorization code minted after the user approves an OAuth request.
// The plaintext code is only ever handed to the client via the redirect; we persist
// its SHA-256 hash, so a leak of the database does not leak usable codes. Carries the
// PKCE challenge (S256) and the exact scopes/resource the user consented to.
export class AuthorizationCode {
  constructor(
    readonly codeHash: string,
    readonly clientId: string,
    readonly userId: string,
    readonly redirectUri: string,
    readonly codeChallenge: string,
    readonly scopes: ApiScope[],
    readonly resource: string | null,
    readonly expiresAt: number,
    readonly consumedAt: number | null,
  ) {}

  static issue(
    clientId: string,
    userId: string,
    redirectUri: string,
    codeChallenge: string,
    scopes: ApiScope[],
    resource: string | null,
  ): { model: AuthorizationCode; code: string } {
    const code = randomBytes(32).toString('hex');
    const model = new AuthorizationCode(
      AuthorizationCode.hash(code),
      clientId,
      userId,
      redirectUri,
      codeChallenge,
      scopes,
      resource,
      Date.now() + CODE_TTL_MS,
      null,
    );
    return { model, code };
  }

  static hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  isUsable(now: number): boolean {
    return this.consumedAt === null && this.expiresAt > now;
  }

  // PKCE S256: the client proves it holds the verifier whose SHA-256, base64url-encoded,
  // equals the challenge it sent at authorization time.
  verifyPkce(codeVerifier: string): boolean {
    const digest = createHash('sha256').update(codeVerifier).digest('base64url');
    return digest === this.codeChallenge;
  }

  consume(at: number): AuthorizationCode {
    return new AuthorizationCode(
      this.codeHash,
      this.clientId,
      this.userId,
      this.redirectUri,
      this.codeChallenge,
      this.scopes,
      this.resource,
      this.expiresAt,
      at,
    );
  }
}
