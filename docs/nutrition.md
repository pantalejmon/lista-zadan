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

## Dalsze etapy

Liczenie makro przepisu (konwersja jednostek składników, porcje, pokrycie) oraz bilans
per domownik dochodzą w kolejnych krokach epiku — ten dokument rośnie razem z nimi.
