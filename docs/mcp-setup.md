# Serwer MCP — podłączenie agenta (Claude Cowork)

Aplikacja wystawia **serwer MCP** (Model Context Protocol) przez zwykły endpoint HTTP,
dzięki czemu agent AI (np. Claude Cowork) może sterować modułami — „zaplanuj tydzień
posiłków", „dopisz zakupy na listę", „co brakuje w spiżarni" — przez narzędzia, bez klikania w UI.

Endpoint MCP:

```
POST https://TWOJA-DOMENA/api/mcp
Content-Type: application/json
```

Transport: Streamable HTTP (odpowiedzi JSON, bez strumieniowania SSE). Obsługiwane metody
JSON-RPC 2.0: `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`.

Uwierzytelnianie: **OAuth 2.1** (natywne w konektorze Claude — zalecane) **albo** statyczny
**token maszynowy** `Authorization: Bearer lz_…` (skrypty, `curl`, testy). Ten sam guard
(`MachineOrJwtAuthGuard`) akceptuje oba — token wydany przez OAuth to zwykły token `lz_…`,
więc gating scope'ów i przypięcie do gospodarstwa działają identycznie.

## 1. Podłączenie przez OAuth (Claude Cowork / custom connector) — zalecane

Konektory Claude obsługują tylko **brak autoryzacji** albo **OAuth 2.1** — nie da się
wkleić statycznego nagłówka `Bearer`. Dlatego serwer jest jednocześnie **serwerem zasobów**
(endpoint `/api/mcp`) i **serwerem autoryzacji** OAuth 2.1: rejestruje klienta dynamicznie
(RFC 7591), autoryzuje użytkownika przez istniejące logowanie Google, a na końcu wydaje
token dostępowy `lz_…` w przeglądarce (zamiast ręcznego wklejania).

Kroki w Claude:

1. **Ustawienia → Connectors → „+" → Add custom connector**.
2. W polu adresu wklej `https://TWOJA-DOMENA/api/mcp`.
3. Zatwierdź. Claude sam wykryje autoryzację (endpoint zwraca `401` z nagłówkiem
   `WWW-Authenticate` wskazującym metadane), zarejestruje się i otworzy okno logowania.
4. Zaloguj się (Google) i na ekranie zgody kliknij **Zezwól** — Claude dostanie token i
   połączy narzędzia.

Co dzieje się „pod maską" (endpointy discovery — przydatne przy diagnostyce):

| Dokument / endpoint | Ścieżka | Rola |
|---------------------|---------|------|
| Protected Resource Metadata (RFC 9728) | `/.well-known/oauth-protected-resource` (oraz `…/api/mcp`) | wskazuje serwer autoryzacji dla zasobu `/api/mcp` |
| Authorization Server Metadata (RFC 8414) | `/.well-known/oauth-authorization-server` | adresy `authorize` / `token` / `register`, PKCE `S256` |
| Dynamic Client Registration (RFC 7591) | `POST /api/oauth/register` | klient publiczny (PKCE, bez sekretu) |
| Authorize | `GET /api/oauth/authorize` | logowanie + ekran zgody, zwraca kod |
| Token | `POST /api/oauth/token` | wymiana kodu + PKCE na token `lz_…` |

Szczegóły:
- Wymagane **PKCE `S256`** oraz `redirect_uri` z allowlisty klienta (`https` lub loopback).
- Zakres (`scope`) z żądania decyduje o nadanych uprawnieniach; bez `scope` nadawane są
  wszystkie scope'y MCP. Token OAuth **nie** jest przypięty do gospodarstwa (jak sesja
  człowieka — sięga po gospodarstwa użytkownika, egzekwowane per narzędzie).
- Token dostępowy wygasa po **90 dniach**; brak refresh tokenów — po wygaśnięciu Claude
  ponawia autoryzację. Odwołasz go jak każdy inny: `DELETE /api/tokens/:id` (etykieta `MCP: <klient>`).
- **`app.publicUrl`** w konfiguracji musi wskazywać publiczny adres (schemat + host), bo z niego
  budowany jest `issuer` i dokumenty discovery. Puste = wyliczane z żądania (z `X-Forwarded-*`).

## 2. Podłączenie statycznym tokenem (skrypty, `curl`)

Do skryptów i testów wygeneruj token maszynowy i podawaj go w nagłówku (panel UI powstanie w #29,
na razie przez REST):

```bash
curl -X POST https://TWOJA-DOMENA/api/tokens \
  -H 'Content-Type: application/json' \
  -H 'Cookie: access_token=<twoje-cookie-sesyjne>' \
  -d '{
    "name": "Cowork",
    "scopes": ["todo:read","todo:write","meals:read","meals:write"],
    "householdId": "<id-gospodarstwa>",
    "expiresInDays": 180
  }'
```

Odpowiedź zawiera pole `token` (`lz_…`) — **pokazywane tylko raz**, skopiuj je. Wskazówki:
- `householdId` przypina token do jednego gospodarstwa (narzędzia posiłków nie wymagają wtedy podawania gospodarstwa i nie dotkną innego).
- dobierz najwęższy zestaw scope'ów jakiego agent potrzebuje.

Szybki test połączenia:

```bash
curl -X POST https://TWOJA-DOMENA/api/mcp \
  -H 'Authorization: Bearer lz_...' -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

`tools/list` zwraca **tylko** narzędzia, na które pozwalają scope'y tokenu.

## 3. Dostępne narzędzia

**Todo / listy** (scope `todo:*`):
- `list_todo_lists` — listy zadań użytkownika,
- `list_todos` — zadania z listy (opcjonalnie z danego dnia),
- `add_todo` — dodaj zadanie,
- `complete_todo` — oznacz wykonane / cofnij.

**Posiłki** (scope `meals:*`, gospodarstwo z tokenu lub argumentu `householdId`):
- `list_recipes`, `get_week_plan`, `get_shopping_list`, `what_is_missing`,
- `add_shopping_item`, `generate_shopping_from_plan`,
- `list_products`, `get_pantry`, `create_product`, `set_pantry_stock`.

**Gospodarstwo** (scope `households:read`, eksport dodatkowo `meals:read`+`todo:write`):
- `list_households`,
- `export_shopping_to_list` — eksportuj listę zakupów posiłków do wskazanej listy zadań.

**Serwis domu** (scope `home:*`):
- `list_home_assets`, `add_home_asset`, `add_maintenance`, `complete_maintenance`.

Wszystkie narzędzia przechodzą przez te same serwisy domenowe co UI, więc obowiązują
identyczne uprawnienia (członkostwo w gospodarstwie, role owner/editor/viewer). Narzędzia
wymagające kilku uprawnień (np. eksport: `meals:read` + `todo:write`) egzekwują **wszystkie**.

## 4. Przykłady promptów dla agenta

- „Pokaż moje listy zadań, potem dopisz na domyślną: *Odebrać buty ze szewca* na jutro."
- „Co mamy w planie posiłków na ten tydzień i czego brakuje w spiżarni?"
- „Wygeneruj listę zakupów z planu tygodnia i dodaj do niej *ketchup*."

## 5. Bezpieczeństwo

- OAuth: dostęp nadaje **sam użytkownik** na ekranie zgody (Google + PKCE), token nigdy nie
  jest wklejany ręcznie ani nie krąży poza przeglądarką. To domyślna, właściwa droga (#31).
- Statyczny token = hasło. Trzymaj w sekretach connectora, nie w repo.
- Odwołaj natychmiast, gdy wyciekł: `DELETE /api/tokens/:id` (sesja) — dotyczy też tokenów OAuth.
- Token widzi tylko wskazane gospodarstwo (statyczny) i tylko nadane scope'y; `write` implikuje `read`.
- Planowane (epic #26): rate-limit per token i pełny log audytu wywołań (#28), panel UI (#29),
  refresh tokeny dla OAuth, narzędzia spiżarni/serwisu domu (#34, #46).
