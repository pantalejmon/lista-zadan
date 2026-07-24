# Moduł Serwis domu (home service)

„Życie techniczne" domu w jednym miejscu: **instalacje/urządzenia** (piec, klimatyzacja,
komin, PV…) i ich **przeglądy/serwisy cykliczne** z terminami, statusami i kosztami.
Wszystko **per gospodarstwo domowe**, współdzielone z domownikami w czasie rzeczywistym
(WebSocket namespace `home`, pokój `household:<id>`, event `home:changed`).

Moduł jest **wyłącznie chmurowy** (wymaga logowania i gospodarstwa) — w trybie lokalnym
w menu widać tylko Zadania.

## Modele

- **HomeAsset** (`home_asset`) — instalacja/urządzenie: `name`, `type` (freeform, z podpowiedziami:
  piec, elektryka, klimatyzacja, wentylacja, komin, pompa ciepła, fotowoltaika, gaśnica…),
  `location?`, `installedAt?`, `warrantyUntil?`, `model?`, `serial?`, `notes?`.
- **Maintenance** (`home_maintenance`) — przegląd powiązany z instalacją (`assetId`):
  `type`, `intervalMonths?` (null = jednorazowy), `lastDoneAt?`, `nextDueAt?`, `cost?`, `notes?`.

Backend: standardowa architektura heksagonalna (`domain/` + `infrastructure/` + `web/`),
CRUD skopowany po `householdId`, uprawnienia przez `SharingService.assertHouseholdPermission`
(zapis: owner/editor; odczyt: także viewer).

## Wyliczanie następnego terminu (`nextDueAt`)

`nextDueAt` liczony jest z ostatniego wykonania + interwału:

```
nextDueAt = addMonths(lastDoneAt, intervalMonths)
```

- Przy tworzeniu/edycji: jeśli podano **jawny** `nextDueAt`, jest on używany wprost;
  w przeciwnym razie liczony z `lastDoneAt + intervalMonths`.
- Bez `lastDoneAt` **lub** bez `intervalMonths` → `nextDueAt = null` (brak zaplanowanego terminu).
- `addMonths` dodaje pełne miesiące, przycinając dzień do długości docelowego miesiąca
  (31 sty + 1 mies. → 28/29 lut).

## Status przeglądu

Status jest **wyliczany względem „dziś"** (nie przechowywany), z progiem `SOON_DAYS = 30`:

```
days = nextDueAt - dziś (w dniach)
days  < 0            → 'overdue'  (po terminie)
days <= SOON_DAYS    → 'soon'     (zbliża się)
w przeciwnym razie   → 'ok'       (aktualny)
nextDueAt == null    → 'none'     (bez terminu)
```

W odpowiedzi API zwracany jest też `daysUntilDue` (ujemny = po terminie). Na froncie
statusy mają kolory: `overdue` czerwony, `soon` bursztynowy, `ok` zielony, `none` szary.
Widok „Serwis domu" pokazuje na górze **agendę** — wszystkie przeglądy `overdue`/`soon`
w całym gospodarstwie, posortowane po najbliższym terminie.

## Pętla domykająca — „Odhacz wykonanie" (`completeMaintenance`)

```
Instalacja → przegląd cykliczny → termin się zbliża/mija
   → „Odhacz wykonanie" (data + opcjonalny koszt)
   → lastDoneAt = data, nextDueAt = addMonths(data, interval), koszt zapisany
   → kolejny termin ustawiony automatycznie
```

- Data domyślnie = dziś (można cofnąć/ustawić w modalu).
- Koszt opcjonalny — nadpisuje poprzedni tylko gdy podany.
- Dla przeglądu jednorazowego (`intervalMonths = null`) po odhaczeniu `nextDueAt` pozostaje
  `null` (status `none`) — nie planuje kolejnego terminu.

## Realtime

Każda zmiana (asset/maintenance) emituje `home:changed` do pokoju gospodarstwa; front
odświeża dane przez `useHomeRealtime`. Usunięcie instalacji kaskadowo usuwa jej przeglądy.

## Roadmapa (epic #37)

Zrobione: **#38** (instalacje), **#39** (przeglądy + statusy + pętla), **#45** (dashboard + lewe menu).
Następne: **#40** (przypomnienia o przeglądach → Zadania/kalendarz), **#41–#44** (remonty,
koszty, wykonawcy, dokumenty/storage plików), **#46** (narzędzia MCP — po epiku #26).
