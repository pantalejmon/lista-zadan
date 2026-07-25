# MCP OAuth 2.1 — serwer autoryzacji dla konektorów

Konektory Claude (Cowork / custom connector) obsługują tylko **brak autoryzacji** albo
**OAuth 2.1** — nie da się w nich wkleić statycznego nagłówka `Authorization: Bearer`.
Dlatego aplikacja pełni **dwie role** naraz:

- **serwer zasobów** (Resource Server) — endpoint MCP `POST /api/mcp`,
- **serwer autoryzacji** (Authorization Server) — moduł `oauth/`, który rejestruje klienta,
  prowadzi użytkownika przez logowanie + zgodę i wydaje token dostępowy.

Kluczowa decyzja projektowa: **token dostępowy OAuth to zwykły token maszynowy `lz_…`**
(`ApiTokenService.issueOAuthToken`). Dzięki temu `MachineOrJwtAuthGuard` i cały gating scope'ów
w `McpService` działają **bez zmian** — OAuth to jedynie sterowany przeglądarką sposób
wydania tokenu, zamiast ręcznego wklejania. Patrz też `docs/api-tokens.md` i `docs/mcp-setup.md`.

## Pełny przepływ (Authorization Code + PKCE)

```
Claude                         Aplikacja (RS + AS)
  │  POST /api/mcp (bez tokenu)          │
  │ ───────────────────────────────────►│  401 + WWW-Authenticate:
  │ ◄───────────────────────────────────│    Bearer resource_metadata="…/.well-known/oauth-protected-resource"
  │  GET /.well-known/oauth-protected-resource      → { authorization_servers:[issuer] }
  │  GET /.well-known/oauth-authorization-server    → { authorize, token, register, S256 }
  │  POST /api/oauth/register (RFC 7591)            → { client_id }        (klient publiczny, PKCE)
  │  GET /api/oauth/authorize?…code_challenge=…      (otwarte w przeglądarce)
  │      • brak sesji → 302 /api/auth/google, powrót przez cookie oauth_return
  │      • jest sesja → ekran zgody (scope + Zezwól/Odmów)
  │      • Zezwól     → 302 redirect_uri?code=…&state=…
  │  POST /api/oauth/token (code + code_verifier)   → { access_token: lz_…, token_type, expires_in, scope }
  │  POST /api/mcp  Authorization: Bearer lz_…      → narzędzia (gated scope'ami tokenu)
```

## Endpointy

Discovery (poza globalnym prefiksem `api`, wykluczone w `main.ts`):

- `GET /.well-known/oauth-authorization-server` (RFC 8414) — `issuer`, `authorization_endpoint`,
  `token_endpoint`, `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`,
  `token_endpoint_auth_methods_supported: ["none"]`.
- `GET /.well-known/oauth-protected-resource` **oraz** `…/api/mcp` (RFC 9728) — `resource`
  (URL endpointu MCP) i `authorization_servers`. Obie ścieżki zwracają ten sam dokument, bo
  klient wyprowadza wariant z sufiksem z URL-a zasobu.

Serwer autoryzacji (`/api/oauth`, kontroler `OAuthController`):

- `POST /register` — dynamiczna rejestracja klienta (RFC 7591). Tylko klienci publiczni z PKCE
  (brak `client_secret`). `redirect_uris` musi być `https` albo loopback (`127.0.0.1`/`localhost`),
  dozwolone też własne schematy natywne.
- `GET /authorize` — waliduje klienta + `redirect_uri` (nie przekierowuje przy złym kliencie —
  ryzyko open-redirect, renderuje stronę błędu), wymusza PKCE `S256`, rozwiązuje scope'y, po
  czym wymaga sesji (inaczej bounce przez Google) i renderuje ekran zgody.
- `POST /authorize/decision` — chroniony sesją (`JwtAuthGuard`); `Zezwól` → wydaje kod i
  przekierowuje na `redirect_uri?code=…&state=…`, `Odmów` → `error=access_denied`.
- `POST /token` — `grant_type=authorization_code`; sprawdza kod (jednorazowy, 5 min TTL),
  zgodność `client_id`/`redirect_uri`, weryfikuje PKCE, **konsumuje kod przed** wydaniem tokenu
  (ochrona przed replay) i mennicuje token `lz_…`. Błędy w formacie `{ error, error_description }`.

## Model danych

- **`oauth_client`** — `clientId` (`lzc_<uuid>`), `clientName`, `redirectUris` (JSON), `createdAt`.
  Klient publiczny — sekret nie jest przechowywany; wiązanie flow zapewnia allowlista
  `redirect_uri` + PKCE.
- **`oauth_auth_code`** — `codeHash` (**SHA-256** kodu; plaintext tylko w redirokcie), `clientId`,
  `userId`, `redirectUri`, `codeChallenge` (S256), `scopes`, `resource`, `expiresAt`, `consumedAt`
  (jednorazowość).

Warstwy modułu (ports & adapters, jak reszta backendu):
`oauth/domain/` (modele `OAuthClient`, `AuthorizationCode`, `OAuthService`, `OAuthError`, porty),
`oauth/infrastructure/` (encje + adaptery TypeORM), `oauth/web/` (`OAuthController`,
`OAuthMetadataController`). Współdzielony `common/public-url.ts` liczy publiczny `issuer`
(preferuje `app.publicUrl`, w przeciwnym razie z żądania z uwzględnieniem `X-Forwarded-*`).

## Bezpieczeństwo i granice

- **PKCE `S256` wymagane** — brak wsparcia dla `plain`; brak `code_challenge` = `invalid_request`.
- **Kod jednorazowy** (5 min) — konsumowany przed wydaniem tokenu; replay → `invalid_grant`.
- **Open-redirect** — nieznany klient / niepasujący `redirect_uri` nie przekierowuje, tylko
  renderuje stronę błędu; `redirect_uri` musi być `https`/loopback.
- **Zgoda użytkownika** — token wydaje dopiero kliknięcie „Zezwól"; scope'y pochodzą z żądania
  (bez `scope` → wszystkie scope'y MCP), token nie jest przypięty do gospodarstwa.
- **Wygaśnięcie** — token dostępowy 90 dni; brak refresh tokenów (Claude ponawia flow). Odwołanie
  jak każdego tokenu: `DELETE /api/tokens/:id`.
- **`issuer`** — musi się zgadzać między dokumentami discovery; ustaw `app.publicUrl` w produkcji
  (za reverse proxy `X-Forwarded-Proto/Host` + `trust proxy`).
