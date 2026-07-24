# Moduł Finanse

Przeniesiony z osobnej aplikacji **`pantalejmon/finansowy-notatnik`** (React 19 + Vite +
Tailwind + IndexedDB) jako integralny moduł aplikacji domowej. Dane są **per gospodarstwo
domowe**, współdzielone z domownikami w czasie rzeczywistym (WebSocket namespace `finance`,
pokój `household:<id>`, event `finance:changed`). Moduł jest **wyłącznie chmurowy**.

## Co zostało przeniesione (i co się zmieniło)

| Oryginał (`finansowy-notatnik`) | Tutaj |
|---|---|
| `AppData` w IndexedDB (jeden blob) | trzy tabele: `finance_wallet`, `finance_transaction`, `finance_recurring` |
| transakcje zagnieżdżone w portfelu | osobna tabela + indeks po `walletId` (filtrowanie i agregacja po stronie serwera) |
| dogonienie cyklicznych na froncie przy starcie | `materialiseDue` w serwisie, przy odczycie |
| donut 9 kolorów „wydatki wg kategorii" | **słupki poziome w jednym odcieniu** z etykietami wartości |
| własna paleta emerald/slate | paleta aplikacji (`primary-*`), semantyka: przychód = emerald, wydatek = red |
| eksport/import JSON | pominięty — dane są w chmurze i współdzielone |

## Modele

- **Wallet** (`finance_wallet`) — portfel: `name`. Saldo i liczba transakcji są **wyliczane**
  (nie przechowywane).
- **Transaction** (`finance_transaction`) — `amount` (**dodatnia = przychód, ujemna = wydatek**),
  `description`, `category?`, `occurredAt` (epoch ms), `recurringId?` (ustawione, gdy pozycja
  powstała z reguły cyklicznej).
- **RecurringTransaction** (`finance_recurring`) — reguła: `amount`, `description`, `category?`,
  `frequency` (`daily`/`weekly`/`monthly`), `nextDueAt` (YYYY-MM-DD).

**Pieniądze:** kwoty to PLN zaokrąglane do groszy (`roundMoney`) przy każdym zapisie i przy
agregacji — spójnie z `cost`/`budget` w Serwisie domu, bez dryfu przy sumowaniu. Kwota `0`
jest odrzucana (400).

## Dogonienie transakcji cyklicznych (`materialiseDue`)

Odpowiednik zachowania oryginału „przy starcie apki", tylko po stronie serwera. Wywoływane
przy odczycie (`getWallets`, `getTransactions`, `getStats`):

```
dla każdej reguły gospodarstwa:
  jeśli nextDueAt > dziś → pomiń
  dopóki nextDueAt <= dziś (i licznik < MAX_CATCH_UP_PER_RULE):
      utwórz transakcję (occurredAt = ten dzień, recurringId = reguła)
      nextDueAt = advanceDue(nextDueAt, frequency)
  zapisz regułę z nowym nextDueAt
```

- **Idempotentne** — powtórny odczyt nic nie dubluje (reguła ma już `nextDueAt` w przyszłości).
- `advanceDue`: `daily` +1 dzień, `weekly` +7 dni, `monthly` +1 miesiąc z **przycięciem dnia**
  do długości miesiąca docelowego (31 sty → 28/29 lut).
- `MAX_CATCH_UP_PER_RULE = 500` — zabezpieczenie, żeby reguła dzienna zapomniana na lata nie
  zablokowała żądania (oryginał nie miał limitu).
- Wygenerowanie pozycji emituje `finance:changed`, więc inne urządzenia od razu widzą zmianę.

## Statystyki (`getStats`)

Liczone po stronie serwera dla portfela (lub całego gospodarstwa):

- `income` / `expenses` / `balance` — sumy, zaokrąglone,
- `byCategory` — **tylko wydatki**, zsumowane po kategorii (`null` → „Inne"), malejąco,
- `trend` — narastające saldo w czasie (chronologicznie), obcięte do ostatnich
  `MAX_TREND_POINTS = 200` punktów.

**Formy wykresów** (wg `dataviz`): porównanie wielkości między kategoriami → **słupki
poziome w jednym odcieniu** z etykietami wartości i udziałem %, nie donut (kątów nie da się
porównywać, a 9 odcieni jest nierozróżnialne przy CVD). Trend salda → **jedna seria**:
linia 2px + delikatny gradient, przerywana linia zera, crosshair z tooltipem na hover.
Kolory słupków/linii: `primary-600` (light) i `primary-400` (dark) — oba przechodzą kontrast
≥3:1 względem swojej powierzchni (sprawdzone walidatorem, nie „na oko"). Kolory
semantyczne (emerald/red) zostają na **kwotach**, nie na markach wykresu.

## UI

Sekcja **Finanse** w lewym menu, zakładki **Transakcje | Cykliczne | Statystyki**.
Nad zakładkami pasek portfela: nazwa + saldo, rozwijany wybór portfela oraz akcje
(nowy / zmiana nazwy / usunięcie). Portfel jest pojęciem *wewnątrz* modułu — gospodarstwo
nadal wybiera się globalnie w lewym pasku.

Usunięcie portfela kasuje kaskadowo jego transakcje i reguły cykliczne.

## API

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/api/finance/categories` | Podpowiadane kategorie |
| `GET/POST` | `/api/finance/wallets` | Portfele (z saldem) / nowy |
| `PUT/DELETE` | `/api/finance/wallets/:id` | Zmiana nazwy / usunięcie (kaskada) |
| `GET/POST` | `/api/finance/transactions` | Lista (opcj. `walletId`) / nowa |
| `PATCH/DELETE` | `/api/finance/transactions/:id` | Edycja / usunięcie |
| `GET/POST` | `/api/finance/recurring` | Reguły cykliczne / nowa |
| `PUT/DELETE` | `/api/finance/recurring/:id` | Edycja / usunięcie |
| `GET` | `/api/finance/stats` | Podsumowanie + kategorie + trend |

Uprawnienia jak wszędzie: zapis `owner`/`editor`, odczyt także `viewer`
(`SharingService.assertHouseholdPermission`).

## Dalsze kroki

Powiązanie finansów z resztą domu (zakupy, remonty, przeglądy) oraz narzędzia MCP dla modułu
są rozpisane jako osobne taski — patrz epik „Finanse ↔ reszta domu".
