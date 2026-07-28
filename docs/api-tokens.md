# Tokeny maszynowe (dostęp dla agentów / MCP)

Fundament pod dostęp maszynowy (epic #26): obok interaktywnego logowania Google (JWT w cookie)
aplikacja wydaje **tokeny maszynowe** typu PAT, którymi agent (np. Claude Cowork) albo skrypt
uwierzytelnia się bez człowieka w pętli. Ten dokument opisuje model tokenów i guard; właściwy
serwer MCP i panel administracyjny to kolejne taski (#30, #29).

## Model tokenu (`api_token`)

- `userId` — właściciel (token działa z jego tożsamością i uprawnieniami),
- `name` — etykieta („Cowork laptop"),
- `tokenHash` — **SHA-256** sekretu; plaintext nie jest nigdzie przechowywany,
- `scopes` — lista uprawnień (patrz niżej),
- `householdId` — opcjonalne przypięcie do jednego gospodarstwa (null = bez przypięcia),
- `expiresAt` — opcjonalny czas wygaśnięcia (max 365 dni),
- `lastUsedAt` — znacznik ostatniego użycia (podstawowy audyt),
- `revokedAt` — znacznik odwołania.

Sekret ma postać `lz_<64 hex>` i jest pokazywany **jednorazowo** przy tworzeniu
(`POST /api/tokens` zwraca pole `token`). Późniejsze listowanie nie zwraca sekretu.

## Scope'y

Format `<moduł>:<dostęp>`, moduły: `todo`, `meals`, `home`, `households`, `finance`, `settings`; dostęp: `read` / `write`.
Reguła: **`write` implikuje `read`** (token z `todo:write` spełnia wymóg `todo:read`, ale nie odwrotnie).
Pełna lista: `GET /api/tokens/scopes`.

## Uwierzytelnianie — `MachineOrJwtAuthGuard`

Jeden guard obsługuje oba światy:

- **Cookie sesyjne** (Google/JWT) → pełna tożsamość człowieka, **bez** ograniczeń scope.
- **`Authorization: Bearer lz_…`** → token maszynowy: guard weryfikuje hash, aktywność
  (nie odwołany, nie wygasły), ładuje właściciela i dokłada `req.apiToken` (scope'y + household).
  Na końcu egzekwuje scope'y zadeklarowane dekoratorem `@RequireScopes(...)` na handlerze.

Endpointy administracji tokenów (`POST/GET/DELETE /api/tokens`) są **wyłącznie sesyjne**
(zwykły `JwtAuthGuard`) — token maszynowy nie może wydawać kolejnych tokenów.

Przypięcie do gospodarstwa egzekwuje się dodatkowo przez `ApiTokenService.assertHouseholdAllowed(token, householdId)`
w miejscach, gdzie żądanie wskazuje konkretne gospodarstwo (użyje tego serwer MCP).

## API (na dziś)

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| `GET`  | `/api/tokens/scopes` | sesja | Lista dostępnych scope'ów |
| `GET`  | `/api/tokens`        | sesja | Tokeny użytkownika (bez sekretów) |
| `POST` | `/api/tokens`        | sesja | Wydaj token — `{name, scopes[], householdId?, expiresInDays?}`; zwraca sekret raz |
| `DELETE` | `/api/tokens/:id`  | sesja | Odwołaj token |
| `GET`  | `/api/tokens/whoami` | sesja **lub** bearer | Diagnostyka connectora — zwraca tożsamość, `householdId`, `scopes` |

## Tokeny wydawane przez OAuth

Oprócz ręcznie tworzonych tokenów (`POST /api/tokens`) te same tokeny `lz_…` wydaje
**flow OAuth 2.1** dla konektorów MCP (`ApiTokenService.issueOAuthToken`, patrz `docs/mcp-oauth.md`).
Taki token: nie jest przypięty do gospodarstwa (`householdId = null`), niesie scope'y z ekranu
zgody, wygasa po 90 dniach i ma etykietę `MCP: <nazwa-klienta>`. Dla guarda i narzędzi MCP jest
nieodróżnialny od tokenu ręcznego — odwołuje się go tak samo (`DELETE /api/tokens/:id`).

## Kolejne kroki (epic #26)

- **#30** — serwer MCP (Streamable HTTP) reużywający serwisów domenowych, chroniony tym guardem + scope'ami. ✅
- **#31** — natywny MCP OAuth 2.1 zamiast wklejania tokenu. ✅ (`docs/mcp-oauth.md`)
- **#29** — panel administracyjny (UI) do zarządzania tokenami.
- **#32–#35** — narzędzia MCP per moduł (todo, posiłki, spiżarnia, zakupy/households).
- **#28 dalej** — rate-limit per token i pełny log audytu (na razie mamy `lastUsedAt`); refresh tokeny dla OAuth.
