# Serwer MCP — podłączenie agenta (Claude Cowork)

Aplikacja wystawia **serwer MCP** (Model Context Protocol) przez zwykły endpoint HTTP,
dzięki czemu agent AI (np. Claude Cowork) może sterować modułami — „zaplanuj tydzień
posiłków", „dopisz zakupy na listę", „co brakuje w spiżarni" — przez narzędzia, bez klikania w UI.

Uwierzytelnianie odbywa się **tokenem maszynowym** (patrz `docs/api-tokens.md`).

## 1. Wygeneruj token

W aplikacji (zalogowany) wywołaj API tokenów — panel UI powstanie w #29, na razie przez REST:

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

## 2. Endpoint MCP

```
POST https://TWOJA-DOMENA/api/mcp
Authorization: Bearer lz_...
Content-Type: application/json
```

Transport: Streamable HTTP (odpowiedzi JSON, bez strumieniowania SSE). Obsługiwane metody
JSON-RPC 2.0: `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`.

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

- Token = hasło. Trzymaj w sekretach connectora, nie w repo.
- Odwołaj natychmiast, gdy wyciekł: `DELETE /api/tokens/:id` (sesja).
- Token widzi tylko wskazane gospodarstwo i tylko nadane scope'y; `write` implikuje `read`.
- Planowane (epic #26): rate-limit per token i pełny log audytu wywołań (#28), panel UI (#29),
  natywny MCP OAuth zamiast wklejania tokenu (#31), narzędzia spiżarni/serwisu domu (#34, #46).
