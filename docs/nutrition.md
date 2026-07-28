# Wartości odżywcze (produkty → przepisy → bilans)

Moduł Posiłki liczy makro od dołu: **produkt** niesie wartości z etykiety, **przepis**
sumuje je po składnikach, **planer** rozdziela na domowników. Ten dokument opisuje
konwencje i algorytmy tego łańcucha. Wszystko żyje po stronie serwera
(`server/src/meal/`) — moduł jest cloud-only, patrz `docs/meals.md`.

## Jednostka odniesienia

Wartości podaje się **zawsze względem jednostki bazowej produktu** (`baseUnit`):

| `baseUnit` | Wartości dotyczą | Przykład |
|------------|------------------|----------|
| `g`        | 100 g            | mąka: 364 kcal / 100 g |
| `ml`       | 100 ml           | mleko: 60 kcal / 100 ml |
| `szt`      | **1 sztuki**     | jajko: 78 kcal / szt |

To najczęstsze źródło pomyłek przy przepisywaniu z opakowania, więc UI podpisuje
pola jednostką (`nutritionBasisLabel`), a nie zostawia ich gołych.

## Komplet albo nic

`Nutrition` (`server/src/meal/domain/nutrition.ts`) wymaga **kcal + białka + tłuszczu
+ węglowodanów**; błonnik i sól są opcjonalne. Etykieta na opakowaniu zawsze ma tę
czwórkę, a policzenie przepisu z połowy danych dawałoby wynik zaniżony **po cichu** —
gorzej niż brak wyniku. Dlatego:

- `NutritionDto` odrzuca niekompletny blok (400),
- formularz produktu blokuje zapis i mówi, czego brakuje,
- produkt bez makro jest legalny i oznaczony w UI („bez makro").

Persystencja: kolumny `kcal`, `protein`, `fat`, `carbs`, `fiber`, `salt` w `meal_product`
(wszystkie nullable). `kcal IS NULL` = produkt bez wartości odżywczych.

## Makro przepisu (`computeRecipeNutrition`)

Wejście: składniki przepisu, produkty gospodarstwa i liczba porcji (`Recipe.servings`,
domyślnie 1). Wyjście: `{ total, perServing, coverage, missing }`.

1. Zbuduj mapę produktów **po nazwie** (`name.toLowerCase() → Product`) — dokładnie ten sam
   mechanizm dopasowania co `computeNeeds` w `docs/meals.md`. Jeden sposób dopasowania w module.
2. Dla każdego składnika:
   - `quantity <= 0` → **pomiń całkowicie** („sól do smaku"). Brak ilości to świadomy zapis,
     a nie brakujące dane, więc nie psuje pokrycia.
   - przelicz ilość na jednostkę bazową produktu (`toBaseQuantity`, tabela niżej),
   - brak produktu / produkt bez makro / nieprzeliczalna jednostka → **do `missing`**,
   - w przeciwnym razie dodaj `nutrition × mnożnik`, gdzie mnożnik to `ilość / 100`
     dla `g`/`ml` oraz `ilość` dla `szt`.
3. `coverage = policzone / (policzone + missing)`; brak policzalnych składników → `0`
   (nigdy fałszywe 100%).
4. `perServing = total / servings`. Kalorie zaokrąglane do 1 kcal, makroskładniki do 0,1 g.

Błonnik i sól sumują się **tylko z produktów, które je podają**. Jeśli żaden nie podaje —
pole zostaje puste, zamiast udawać zero.

### Konwersja jednostek składnika

`RecipeIngredient.unit` to wolny tekst, więc przelicza się go na jednostkę bazową produktu:

| Zapis w przepisie | Jednostka bazowa | Mnożnik |
|-------------------|------------------|---------|
| pusty             | dowolna          | ×1 (już w jednostce bazowej) |
| `g`, `gram(y)`    | `g`              | ×1 |
| `dag`, `deka`     | `g`              | ×10 |
| `kg`, `kilogram`  | `g`              | ×1000 |
| `mg`              | `g`              | ×0,001 |
| `ml`              | `ml`             | ×1 |
| `l`, `litr(y)`    | `ml`             | ×1000 |
| `szt`, `sztuk(a/i)` | `szt`          | ×1 |

Zapis jest odporny na wielkość liter i kropkę (`Szt.`, `KG`). **Nie ma tu „łyżki",
„szklanki" ani „szczypty"** — ich przeliczenie zależy od składnika (łyżka oliwy ≠ łyżka
mąki), więc zamiast zgadywać, oznaczamy składnik jako niepoliczony. Jednostka z innej
rodziny (np. `ml` dla produktu w `g`) też nie jest zgadywana — brakuje gęstości.

### Pokrycie w UI

`coverage < 1` **musi** być widoczne razem z wynikiem (`NutritionSummary`):
„Policzono 75% składników. Bez: Oliwa." Bez tego liczba wygląda na pewnik,
a jest sumą tego, co akurat dało się policzyć. Ostrzeżenie niesie ikonę, nie tylko
kolor — status nigdy nie zależy u nas od samej barwy.

## Prezentacja makro (`NutritionSummary`)

Kafelek to **liczba-bohater** (kcal na porcję) + **pasek składu 100%** + legenda
z wartościami.

**Pasek pokazuje udział energii, nie gramów.** Gram tłuszczu to 9 kcal, a gram
białka czy węglowodanów 4 kcal (współczynniki Atwatera, `KCAL_PER_GRAM`). Pasek
gramowy zaniżałby tłuszcz i kłamał o tym, z czego naprawdę jest ten posiłek.
Legenda podaje **gramy** (tak są na etykiecie) i obok **procent energii**.

**Trzy stałe barwy zamiast jednego odcienia.** `docs/finance.md` ustala, że
porównanie wielkości robimy słupkami w jednym odcieniu — tam chodziło o *ranking
kategorii*, których jest dużo i są zmienne. Tutaj zbiór jest **stały i trzyelementowy**,
a zadaniem koloru jest *tożsamość* (który segment to tłuszcz), nie wielkość — więc
paleta jest kategorialna:

| Makroskładnik | Jasny | Ciemny |
|---------------|-------|--------|
| Białko | `#2a78d6` | `#3987e5` |
| Tłuszcz | `#eb6834` | `#d95926` |
| Węglowodany | `#1baf7a` | `#199e70` |

Tokeny `--macro-*` w `index.css`. Zasady, których trzymamy się przy zmianach:

- **Nie zależą od akcentu.** Akcent jest per użytkownik, a makro znaczy to samo
  u wszystkich — kolor tłuszczu nie może być raz różowy, raz zielony.
- Kroki dla trybu ciemnego są **dobrane osobno** pod ciemne tło, a nie przyciemnione
  automatycznie.
- Paleta przeszła walidację kontrastu i rozróżnialności przy zaburzeniach widzenia
  barw (deuteranopia/tritanopia) na obu tłach. Przy podmianie kolorów **trzeba ją
  zwalidować ponownie**, a nie oceniać na oko.
- Tożsamość nigdy nie zależy od samego koloru: każdy segment ma kropkę + nazwę
  + wartość w legendzie (która działa też jako wersja tabelaryczna).

## Białko roślinne i zwierzęce

Produkt niesie `origin`: `'plant'` | `'animal'` | `null` („nie określono"). Makro przepisu
i bilans sumują dodatkowo `proteinPlant` / `proteinAnimal` — białko ze składników z określonym
pochodzeniem.

**Suma rozbicia bywa mniejsza niż `protein`.** Reszta pochodzi z produktów bez oznaczenia i UI
pokazuje ją jako osobny, szary kubełek „bez oznaczenia" (`ProteinSplit`). Dosypanie jej do
którejkolwiek grupy fałszowałoby obraz — a to jedyna rzecz, po którą się tu sięga.

Nie ma wartości `mixed`: bez proporcji i tak nic by nie policzyła. Produkt złożony albo rozbija
się na składniki, albo zostaje nieoznaczony.

**Kolory:** rozbicie to ta sama wielkość w podziale, nie nowe kategorie — więc dwa **kroki tej
samej niebieskiej rampy** co „białko" w pasku makro (`--macro-protein-plant` /
`--macro-protein-animal`), a nie dwie nowe barwy. Kubełek „bez oznaczenia" jest neutralnie szary.

## Bilans domownika (`getNutritionBalance`)

Odpowiada na „ile kto dziś zjadł". Liczony **per tydzień** (jak planer), z rozbiciem na dni
i posiłki.

Udział domownika w posiłku:

```
makro domownika = perServing(efektywne składniki wpisu) × jego porcje
```

gdzie `perServing` uwzględnia korekty ze slotu (`docs/meals.md` → „Korekty w slocie"),
a `porcje` pochodzą z `MealEntry.participants`. Posiłek doraźny liczy się tak samo, przy
`servings = 1`.

Do bilansu **nie wchodzą**:

- posiłki bez przypisanych domowników (nie wiadomo, komu je policzyć),
- posiłki, których nie dało się policzyć w ogóle (`coverage = 0`).

**Zaplanowane czy zjedzone?** Domyślnie liczymy **zaplanowane** — planer jest planem, więc
bilans na przyszły tydzień pokazywałby same zera. Przełącznik `onlyCooked` zawęża do
posiłków odhaczonych jako ugotowane.

**Pokrycie w bilansie.** Zamiast uśredniać `coverage` (co ukrywałoby, którego posiłku
dotyczy), każdy dzień niesie `incompleteMeals` — liczbę posiłków policzonych częściowo.
UI mówi to wprost pod sumą.

### Cele odżywcze

`NutritionGoal` (tabela `meal_nutrition_goal`) trzyma dzienny cel **per gospodarstwo**,
nie w ustawieniach użytkownika: cel dziecku ustawia rodzic, a ta sama osoba w dwóch
gospodarstwach może mieć różne ustalenia. Ustawić może każdy z prawem zapisu; cel dotyczy
członka tego gospodarstwa (walidowane). Domownik bez celu widzi samą sumę — bez paska
realizacji i bez udawania, że cel wynosi zero.
