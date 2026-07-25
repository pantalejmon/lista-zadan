import { Controller, Get, Post, Req, Res, Body, Query, UseGuards, Header, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { OAuthService } from '../domain/oauth.service';
import { OAuthError } from '../domain/oauth-error';
import { OAuthClient } from '../domain/oauth-client.model';
import { type ApiScope } from '../../api-token/domain/api-scope';
import { AuthService } from '../../auth/domain/auth.service';
import { JwtAuthGuard } from '../../auth/web/jwt-auth.guard';
import { User } from '../../auth/domain/user.model';

// Human-readable labels for the consent screen (Polish UI, matching the app).
const SCOPE_LABELS: Record<ApiScope, string> = {
  'todo:read': 'Odczyt list zadań',
  'todo:write': 'Dodawanie i zmiana zadań',
  'meals:read': 'Odczyt planu posiłków i spiżarni',
  'meals:write': 'Zmiana planu posiłków i spiżarni',
  'home:read': 'Odczyt serwisu domu',
  'home:write': 'Zmiana serwisu domu',
  'households:read': 'Odczyt gospodarstw domowych',
  'households:write': 'Zmiana gospodarstw domowych',
  'finance:read': 'Odczyt finansów (portfele, transakcje)',
  'finance:write': 'Zmiana finansów (portfele, transakcje)',
};

// OAuth 2.1 authorization-server endpoints for MCP connectors. Bodies are accepted
// raw (not class-validator DTOs): the global ValidationPipe's forbidNonWhitelisted
// would reject the optional RFC 7591 / RFC 6749 fields clients legitimately send.
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly authService: AuthService,
  ) {}

  // RFC 7591 dynamic client registration.
  @Post('register')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async register(@Body() body: Record<string, unknown>, @Res() res: Response): Promise<void> {
    try {
      const registration = await this.oauth.registerClient(body.redirect_uris, body.client_name);
      res.status(201).json(registration);
    } catch (e) {
      this.sendOAuthError(res, e);
    }
  }

  // Authorization endpoint. Requires an interactive session; an unauthenticated
  // user is bounced through Google login and returned here to finish consent.
  @Get('authorize')
  async authorize(@Query() query: Record<string, string>, @Req() req: Request, @Res() res: Response): Promise<void> {
    let client: OAuthClient;
    try {
      client = await this.oauth.loadValidatedClient(query.client_id, query.redirect_uri);
    } catch (e) {
      // Bad client / redirect_uri: cannot safely redirect, so render an error page.
      this.renderError(res, e);
      return;
    }

    const redirectUri = query.redirect_uri;
    let scopes: ApiScope[];
    try {
      if ((query.response_type ?? 'code') !== 'code') {
        throw new OAuthError('unsupported_response_type', 'Only response_type=code is supported');
      }
      this.oauth.requireS256Challenge(query.code_challenge, query.code_challenge_method);
      scopes = this.oauth.resolveScopes(query.scope);
    } catch (e) {
      this.redirectError(res, redirectUri, query.state, e);
      return;
    }

    const user = await this.authService.userFromSession(req.cookies?.access_token as string | undefined);
    if (!user) {
      res.cookie('oauth_return', req.originalUrl, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000,
      });
      res.redirect('/api/auth/google');
      return;
    }

    res.type('html').send(this.renderConsent(client, query, scopes));
  }

  // Consent decision (session-guarded). Approve → mint code and redirect back;
  // deny → redirect back with error=access_denied.
  @Post('authorize/decision')
  @UseGuards(JwtAuthGuard)
  async decision(@Body() body: Record<string, string>, @Req() req: Request, @Res() res: Response): Promise<void> {
    const redirectUri = body.redirect_uri;
    let client: OAuthClient;
    try {
      client = await this.oauth.loadValidatedClient(body.client_id, redirectUri);
    } catch (e) {
      this.renderError(res, e);
      return;
    }

    if (body.decision !== 'allow') {
      this.redirectError(res, redirectUri, body.state, new OAuthError('access_denied', 'User denied the request'));
      return;
    }

    try {
      const challenge = this.oauth.requireS256Challenge(body.code_challenge, body.code_challenge_method);
      const scopes = this.oauth.resolveScopes(body.scope);
      const user = req.user as User;
      const code = await this.oauth.issueCode(client, user.id, redirectUri, challenge, scopes, body.resource || null);
      this.redirectSuccess(res, redirectUri, body.state, code);
    } catch (e) {
      this.redirectError(res, redirectUri, body.state, e);
    }
  }

  // Token endpoint — exchanges an authorization code (+ PKCE verifier) for an access token.
  @Post('token')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async token(@Body() body: Record<string, string>, @Res() res: Response): Promise<void> {
    try {
      const result = await this.oauth.exchangeCode({
        grantType: body.grant_type,
        code: body.code,
        redirectUri: body.redirect_uri,
        clientId: body.client_id,
        codeVerifier: body.code_verifier,
      });
      res.status(200).json(result);
    } catch (e) {
      this.sendOAuthError(res, e);
    }
  }

  private redirectSuccess(res: Response, redirectUri: string, state: string | undefined, code: string): void {
    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) {
      url.searchParams.set('state', state);
    }
    res.redirect(url.toString());
  }

  private redirectError(res: Response, redirectUri: string, state: string | undefined, err: unknown): void {
    const oauthError = err instanceof OAuthError ? err : new OAuthError('server_error', 'Unexpected error');
    const url = new URL(redirectUri);
    url.searchParams.set('error', oauthError.code);
    url.searchParams.set('error_description', oauthError.description);
    if (state) {
      url.searchParams.set('state', state);
    }
    res.redirect(url.toString());
  }

  private sendOAuthError(res: Response, err: unknown): void {
    const oauthError = err instanceof OAuthError ? err : new OAuthError('server_error', 'Unexpected error', 500);
    res.status(oauthError.httpStatus).json({ error: oauthError.code, error_description: oauthError.description });
  }

  private renderError(res: Response, err: unknown): void {
    const oauthError = err instanceof OAuthError ? err : new OAuthError('server_error', 'Unexpected error', 500);
    res
      .status(oauthError.httpStatus)
      .type('html')
      .send(
        `<!doctype html><meta charset="utf-8"><title>Błąd autoryzacji</title>` +
          `<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">` +
          `<h1 style="font-size:1.25rem">Nie można autoryzować połączenia</h1>` +
          `<p>${escapeHtml(oauthError.description)}</p>` +
          `<p style="color:#666;font-size:.875rem">Kod błędu: ${escapeHtml(oauthError.code)}</p></body>`,
      );
  }

  private renderConsent(client: OAuthClient, query: Record<string, string>, scopes: ApiScope[]): string {
    const hidden = [
      ['client_id', query.client_id],
      ['redirect_uri', query.redirect_uri],
      ['response_type', query.response_type ?? 'code'],
      ['code_challenge', query.code_challenge],
      ['code_challenge_method', query.code_challenge_method ?? 'S256'],
      ['scope', scopes.join(' ')],
      ['state', query.state ?? ''],
      ['resource', query.resource ?? ''],
    ]
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name!)}" value="${escapeHtml(value!)}">`)
      .join('');

    const scopeItems = scopes
      .map((scope) => `<li>${escapeHtml(SCOPE_LABELS[scope] ?? scope)}</li>`)
      .join('');

    return (
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Autoryzacja połączenia</title>` +
      `<body style="font-family:system-ui;max-width:26rem;margin:3rem auto;padding:0 1rem;color:#111">` +
      `<h1 style="font-size:1.35rem;margin-bottom:.25rem">Autoryzacja połączenia</h1>` +
      `<p style="color:#555;margin-top:0"><strong>${escapeHtml(client.clientName)}</strong> prosi o dostęp do Twojego konta w Lista Zadań.</p>` +
      `<p style="margin-bottom:.4rem">Nadawane uprawnienia:</p>` +
      `<ul style="margin-top:0;padding-left:1.2rem;line-height:1.7">${scopeItems}</ul>` +
      `<form method="post" action="/api/oauth/authorize/decision" style="display:flex;gap:.75rem;margin-top:1.5rem">${hidden}` +
      `<button type="submit" name="decision" value="allow" style="flex:1;padding:.7rem;border:0;border-radius:.5rem;background:#2563eb;color:#fff;font-size:1rem;cursor:pointer">Zezwól</button>` +
      `<button type="submit" name="decision" value="deny" style="flex:1;padding:.7rem;border:1px solid #ccc;border-radius:.5rem;background:#fff;color:#111;font-size:1rem;cursor:pointer">Odmów</button>` +
      `</form></body>`
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
