# Moduł Posiłki (meal planner + spiżarnia + zakupy)

Sekcja „Posiłki" to zintegrowana część aplikacji domowej. Dane są **per gospodarstwo
domowe** (nie per lista) i współdzielone między wszystkimi domownikami w czasie
rzeczywistym (WebSocket namespace `meal`, pokój `household:<id>`, event `meal:changed`).

## Moduł jest cloud-only

Tryb lokalny (bez konta) ogranicza się do modułu **Zadania** — nawigacja nie pokazuje
Posiłków, a sekcja jest wymuszana na `tasks`. Posiłki wymagają gospodarstwa, więc
istnieje **jedna** implementacja storage’u: `createCloudMealStorage(householdId)`
(`client/src/lib/mealsApi.ts`), REST do backendu. Interfejs `MealStorage`
(`client/src/lib/meals.ts`) opisuje jej kontrakt; sam plik trzyma już tylko typy,
stałe i helpery prezentacyjne.

**Algorytmy opisane niżej mają jedno miejsce prawdy:
`server/src/meal/domain/meal.service.ts`.** (Do wersji sprzed tego uporządkowania front
zawierał bliźniaczą implementację na IndexedDB — została usunięta jako nieosiągalna
z UI. Osierocona baza `lista-zadan-meals` w przeglądarkach nie jest kasowana: mogą w
niej siedzieć dane sprzed ograniczenia trybu lokalnego, a usunięcie byłoby nieodwracalne.)

## Pojęcia

- **Produkt** (`Product`) — pozycja słownika: nazwa, jednostka bazowa (`g`/`ml`/`szt`),
  `packageSize` (rozmiar standardowego opakowania) i `trackInPantry`. Produkty
  z `trackInPantry = false` to składniki „do smaku" (sól, pieprz) — **pomijane**
  w spiżarni i zakupach. Opcjonalnie niesie też **wartości odżywcze** (`nutrition`):
  na 100 g / 100 ml, a dla `baseUnit = szt` na 1 sztukę. Zapisywane są kompletem
  (kcal + białko + tłuszcz + węglowodany; błonnik i sól opcjonalnie) — z połowy
  etykiety wychodziłoby cicho zaniżone makro przepisu. Szczegóły: `docs/nutrition.md`.
- **Przepis** (`Recipe`) — ma listę składników `recipeIngredients` (`{name, quantity, unit}`).
  Składniki dopasowywane są do produktów **po nazwie** (case-insensitive), nie po
  twardym `productId` — dzięki temu ten sam produkt użyty w wielu przepisach agreguje
  się poprawnie.
- **Wpis planera** (`MealEntry`) — przepis przypisany do slotu `(weekStart, dayOfWeek, mealType)`.
  Niesie też `participants` — kto ten posiłek je i w ilu porcjach (`0,5` = pół porcji,
  `2` = dokładka). Pusta lista znaczy „nieprzypisany": posiłek nadal liczy się do zakupów
  i spiżarni, ale nie wchodzi do niczyjego bilansu (`docs/nutrition.md`). Uczestnikiem może
  być wyłącznie członek gospodarstwa — walidowane przez `SharingService`. Zmiana przepisu
  w slocie **nie** czyści uczestników: to ten sam slot i te same osoby, zmienia się danie.
  Pole `cooked` znaczy „ugotowane" (patrz pętle domykające).
- **Spiżarnia** (`PantryItem`) — aktualny stan produktu (`quantity`) w gospodarstwie.
- **Pozycja zakupowa** (`MealShoppingItem`) — `{name, quantity, unit, isChecked}`.

## Algorytm „Czego brakuje" (`computeNeeds`)

Wejście: tydzień (`weekStart`) oraz opcjonalnie `days` — lista dni tygodnia
(`0 = poniedziałek … 6 = niedziela`) zawężająca obliczenia do wybranych dni (pusto/brak
= cały tydzień). Wyjście: lista `NeedItem` (co i ile dokupić).

1. Pobierz wpisy planera z tygodnia (i odfiltruj do `days`, gdy podano), produkty i stan spiżarni gospodarstwa.
2. Zbuduj mapę produktów **po nazwie** (`name.toLowerCase() → Product`).
3. Dla każdego wpisu → przepisu → składnika:
   - dopasuj produkt po nazwie,
   - jeśli produkt istnieje i `trackInPantry = false` → **pomiń** („do smaku"),
   - w przeciwnym razie **agreguj** wymaganą ilość po produkcie (klucz = `productId`,
     a gdy brak dopasowania = `name:<nazwa>`).
4. Dla każdej zagregowanej pozycji:
   - `inStock` = stan ze spiżarni (0 gdy brak),
   - `shortfall = max(0, required - inStock)` — niedobór,
   - **zaokrąglenie do opakowań**: jeśli `packageSize > 0` i jest niedobór,
     `packages = ceil(shortfall / packageSize)`, a `toBuy = packages * packageSize`.
     Bez `packageSize` kupujemy dokładnie `shortfall`.

   > Przykład: brakuje 120 g ryżu, opakowanie 1000 g → `toBuy = 1000` (1 opak.).
   > Nie da się kupić 120 g, więc kupujemy całe opakowanie.

`generateFromPlan` używa tego samego wyniku (z tym samym filtrem `days`) i tworzy pozycje
zakupowe tylko dla `toBuy > 0`. UI zakupów pozwala wybrać tydzień (strzałki) i konkretne dni,
więc można zrobić listę zakupów np. tylko na weekend albo na przyszły tydzień. Filtr `days`
jest przekazywany end-to-end: `GET /meals/needs` i `POST /meals/shopping/generate` przyjmują
`?days=0,2,4`, a narzędzia MCP `what_is_missing` / `generate_shopping_from_plan` — pole `days`.

## Kategorie, wyszukiwanie i grupowanie

Zarówno **produkty** (`Product.category`), jak i **przepisy** (`Recipe.category`, dodane migracją
`AddRecipeCategory`) mają dowolne, tekstowe kategorie (podpowiedzi: `PRODUCT_CATEGORIES` /
`RECIPE_CATEGORIES` w `client/src/lib/meals.ts`). W UI listy Produktów i Przepisów są
**pogrupowane po kategoriach** (helpery `groupByCategory` / `presentCategories`), z wyszukiwarką
i przewijalnymi chipami kategorii (`CategoryFilter`) — ergonomicznie na telefonie. Kategoria
przepisu jest częścią modelu i przechodzi przez REST oraz narzędzia MCP `create_recipe` /
`update_recipe` (pole `category`).

## Pętle domykające (loop closers)

Domykają obieg **planer → spiżarnia → zakupy → spiżarnia**, żeby stan spiżarni sam
się aktualizował.

### a) Ugotowanie posiłku → odjęcie ze spiżarni

`setCooked(entryId, cooked)`:

- operacja jest **idempotentna** — przełączenie na ten sam stan nie robi nic,
- zmiana `false → true` (ugotowano): dla każdego składnika przepisu dopasowanego
  po nazwie do produktu z `trackInPantry = true` **odejmij** `quantity` ze spiżarni
  (znak `-1`),
- zmiana `true → false` (cofnięcie): **dodaj** z powrotem (znak `+1`),
- stan spiżarni jest podłogowany do zera (`max(0, ...)`),
- zmiana przepisu w slocie (`addEntry`/`withRecipe`) **resetuje** `cooked` na `false`,
  żeby nie odejmować składników nie tego dania.

### b) Kupienie pozycji → dodanie do spiżarni

W `toggleShoppingItem(id, isChecked)`:

- gdy zmienia się stan **i** pozycja ma znaną ilość (`quantity > 0`),
- dopasuj pozycję **po nazwie** do produktu z `trackInPantry = true`,
- `isChecked = true` (kupiono) → **dodaj** `quantity` do spiżarni,
- `isChecked = false` (odznaczono) → **odejmij** `quantity`.

Pozycje bez ilości albo bez dopasowanego produktu nie ruszają spiżarni (są
neutralne — np. ręcznie dopisane „coś tam").

## Eksport zakupów do listy zadań (#23)

Realizowany **wyłącznie na froncie** (`ShoppingView` → `ExportModal`), przez istniejące
API todo — bez sprzęgania modułów po stronie backendu:

1. `getLists()` → tylko listy z prawem zapisu (`role !== 'viewer'`).
2. Utwórz jeden todo `kind: 'shopping'` na wybranej liście (tytuł „Zakupy z posiłków (data)").
3. `updateTodo` wypełnia `items` pozycjami listy zakupów (domyślnie tylko niekupione),
   każda jako `{id, text: "<nazwa> – <ilość> <jednostka>", checked: false, order}`.

Dzięki temu eksport trafia np. do listy konkretnego domownika, a lista zakupów posiłków
i lista zadań pozostają niezależne.
