import { randomUUID } from 'crypto';

// A registration-response view (RFC 7591 §3.2.1). Public client, PKCE-only — no
// secret is issued, so `token_endpoint_auth_method` is always `none`.
export interface OAuthClientRegistration {
  client_id: string;
  client_id_issued_at: number;
  client_name: string;
  redirect_uris: string[];
  token_endpoint_auth_method: 'none';
  grant_types: string[];
  response_types: string[];
}

// An OAuth client dynamically registered by an MCP connector (e.g. Claude). We
// only support public clients authenticating with PKCE, so no client secret is
// stored — the redirect-URI allowlist plus PKCE is what binds the flow.
export class OAuthClient {
  constructor(
    readonly clientId: string,
    readonly clientName: string,
    readonly redirectUris: string[],
    readonly createdAt: number,
  ) {}

  static register(clientName: string, redirectUris: string[]): OAuthClient {
    return new OAuthClient(`lzc_${randomUUID()}`, clientName.trim() || 'MCP client', redirectUris, Date.now());
  }

  allowsRedirect(uri: string): boolean {
    return this.redirectUris.includes(uri);
  }

  toRegistration(): OAuthClientRegistration {
    return {
      client_id: this.clientId,
      client_id_issued_at: Math.floor(this.createdAt / 1000),
      client_name: this.clientName,
      redirect_uris: this.redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    };
  }
}
