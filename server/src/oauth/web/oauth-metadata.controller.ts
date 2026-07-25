import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ALL_SCOPES } from '../../api-token/domain/api-scope';
import { resolvePublicUrl } from '../../common/public-url';

// OAuth discovery documents. These MUST live at the domain root (not under the
// global `api` prefix), so they are excluded from the prefix in main.ts. Claude's
// connector fetches them to learn where to register, authorize and get tokens.
@Controller()
export class OAuthMetadataController {
  constructor(private readonly config: ConfigService) {}

  // RFC 8414 — describes this authorization server.
  @Get('.well-known/oauth-authorization-server')
  authorizationServerMetadata(@Req() req: Request): Record<string, unknown> {
    const base = this.baseUrl(req);
    return {
      issuer: base,
      authorization_endpoint: `${base}/api/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      scopes_supported: ALL_SCOPES,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    };
  }

  // RFC 9728 — describes the MCP protected resource and points at its auth server.
  // Served both at the bare path and at the resource-suffixed path, since clients
  // derive the latter from the MCP endpoint's own URL (`/api/mcp`).
  @Get(['.well-known/oauth-protected-resource', '.well-known/oauth-protected-resource/api/mcp'])
  protectedResourceMetadata(@Req() req: Request): Record<string, unknown> {
    const base = this.baseUrl(req);
    return {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      scopes_supported: ALL_SCOPES,
      bearer_methods_supported: ['header'],
    };
  }

  private baseUrl(req: Request): string {
    return resolvePublicUrl(req, this.config.get<string>('app.publicUrl'));
  }
}
