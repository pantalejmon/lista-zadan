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
„Policzono 75% składników. Nie policzono: Oliwa." Bez tego liczba wygląda na pewnik,
a jest sumą tego, co akurat dało się policzyć.

## Dalsze etapy

Bilans per domownik (kto zjadł ile porcji) i cele odżywcze dochodzą w kolejnych krokach
epiku — ten dokument rośnie razem z nimi.
