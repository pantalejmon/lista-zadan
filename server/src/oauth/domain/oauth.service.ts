import { ApiTokenService } from '../../api-token/domain/api-token.service';
import { ALL_SCOPES, isValidScope, type ApiScope } from '../../api-token/domain/api-scope';
import { OAuthClient, type OAuthClientRegistration } from './oauth-client.model';
import { OAuthClientRepositoryPort } from './oauth-client.repository.port';
import { AuthorizationCode } from './authorization-code.model';
import { AuthorizationCodeRepositoryPort } from './authorization-code.repository.port';
import { OAuthError } from './oauth-error';

// How long an issued MCP access token stays valid. The connector re-runs the
// authorization flow when it expires (we do not issue refresh tokens).
const ACCESS_TOKEN_TTL_DAYS = 90;

interface TokenExchange {
  grantType: string | undefined;
  code: string | undefined;
  redirectUri: string | undefined;
  clientId: string | undefined;
  codeVerifier: string | undefined;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

// The OAuth 2.1 authorization-server half of the MCP integration. Access tokens it
// mints are ordinary `lz_` machine tokens, so the resource server (the MCP guard)
// needs no changes — this class is purely the browser-facing issuance flow.
export class OAuthService {
  constructor(
    private readonly clients: OAuthClientRepositoryPort,
    private readonly codes: AuthorizationCodeRepositoryPort,
    private readonly apiTokens: ApiTokenService,
  ) {}

  // RFC 7591 dynamic client registration. We only accept public, PKCE clients.
  async registerClient(redirectUris: unknown, clientName: unknown): Promise<OAuthClientRegistration> {
    const uris = this.validateRedirectUris(redirectUris);
    const name = typeof clientName === 'string' ? clientName : '';
    const client = OAuthClient.register(name, uris);
    await this.clients.save(client);
    return client.toRegistration();
  }

  // Resolves and authorizes the client for an /authorize request. A mismatched or
  // unknown client/redirect must NOT redirect back (open-redirect risk) — it throws.
  async loadValidatedClient(clientId: string | undefined, redirectUri: string | undefined): Promise<OAuthClient> {
    if (!clientId) {
      throw new OAuthError('invalid_request', 'client_id is required');
    }
    const client = await this.clients.findById(clientId);
    if (!client) {
      throw new OAuthError('invalid_client', 'Unknown client_id');
    }
    if (!redirectUri || !client.allowsRedirect(redirectUri)) {
      throw new OAuthError('invalid_request', 'redirect_uri does not match a registered value');
    }
    return client;
  }

  // Space-delimited scope string → validated scopes. Empty request means "all MCP
  // scopes" so a connector that omits `scope` still gets a working token.
  resolveScopes(scopeParam: string | undefined): ApiScope[] {
    const raw = (scopeParam ?? '').trim();
    if (!raw) {
      return [...ALL_SCOPES];
    }
    const requested = raw.split(/\s+/);
    const invalid = requested.filter((s) => !isValidScope(s));
    if (invalid.length > 0) {
      throw new OAuthError('invalid_scope', `Unsupported scope(s): ${invalid.join(', ')}`);
    }
    return [...new Set(requested)] as ApiScope[];
  }

  requireS256Challenge(codeChallenge: string | undefined, method: string | undefined): string {
    if (!codeChallenge) {
      throw new OAuthError('invalid_request', 'code_challenge is required (PKCE)');
    }
    if ((method ?? 'S256') !== 'S256') {
      throw new OAuthError('invalid_request', 'Only the S256 code_challenge_method is supported');
    }
    return codeChallenge;
  }

  // The user approved consent — mint the one-time code handed back via redirect.
  async issueCode(
    client: OAuthClient,
    userId: string,
    redirectUri: string,
    codeChallenge: string,
    scopes: ApiScope[],
    resource: string | null,
  ): Promise<string> {
    const { model, code } = AuthorizationCode.issue(client.clientId, userId, redirectUri, codeChallenge, scopes, resource);
    await this.codes.save(model);
    return code;
  }

  // Exchange a code for an access token (RFC 6749 §4.1.3 + PKCE §4.6). Single-use:
  // the code is consumed before the token is minted, so a replay finds it spent.
  async exchangeCode(params: TokenExchange): Promise<AccessTokenResponse> {
    if (params.grantType !== 'authorization_code') {
      throw new OAuthError('unsupported_grant_type', 'Only authorization_code is supported');
    }
    if (!params.code || !params.codeVerifier) {
      throw new OAuthError('invalid_request', 'code and code_verifier are required');
    }
    const stored = await this.codes.findByHash(AuthorizationCode.hash(params.code));
    const now = Date.now();
    if (!stored || !stored.isUsable(now)) {
      throw new OAuthError('invalid_grant', 'Authorization code is invalid, expired or already used');
    }
    if (params.clientId !== stored.clientId) {
      throw new OAuthError('invalid_grant', 'client_id does not match the authorization code');
    }
    if (params.redirectUri !== stored.redirectUri) {
      throw new OAuthError('invalid_grant', 'redirect_uri does not match the authorization code');
    }
    if (!stored.verifyPkce(params.codeVerifier)) {
      throw new OAuthError('invalid_grant', 'PKCE verification failed');
    }
    await this.codes.save(stored.consume(now));

    const client = await this.clients.findById(stored.clientId);
    const label = `MCP: ${client?.clientName ?? 'connector'}`;
    const created = await this.apiTokens.issueOAuthToken(stored.userId, label, stored.scopes, ACCESS_TOKEN_TTL_DAYS);
    const expiresIn = created.expiresAt ? Math.max(0, Math.floor((created.expiresAt - now) / 1000)) : 0;
    return {
      access_token: created.token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: stored.scopes.join(' '),
    };
  }

  private validateRedirectUris(value: unknown): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new OAuthError('invalid_request', 'redirect_uris is required and must be a non-empty array');
    }
    const uris = value.filter((u): u is string => typeof u === 'string' && u.length > 0);
    if (uris.length === 0) {
      throw new OAuthError('invalid_request', 'redirect_uris must contain at least one valid URI');
    }
    for (const uri of uris) {
      if (!this.isAllowedRedirect(uri)) {
        throw new OAuthError('invalid_request', `redirect_uri must be https or localhost: ${uri}`);
      }
    }
    return uris;
  }

  // OAuth 2.1 requires redirect URIs to be https, except loopback for native clients.
  private isAllowedRedirect(uri: string): boolean {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      return false;
    }
    if (parsed.protocol === 'https:') {
      return true;
    }
    if (parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
      return true;
    }
    // Custom app schemes (e.g. Claude desktop) are permitted for native clients.
    return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
  }
}
