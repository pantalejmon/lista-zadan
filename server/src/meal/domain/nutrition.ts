// Wartości odżywcze produktu.
//
// **Jednostka odniesienia wynika z `baseUnit` produktu:**
// - `g`  → wartości na **100 g**
// - `ml` → wartości na **100 ml**
// - `szt` → wartości na **1 sztukę** (jajko, bułka, jogurt w kubku)
//
// kcal i trzy makroskładniki podaje się razem — etykieta na opakowaniu zawsze je
// ma, a policzenie przepisu z połowy danych dawałoby cicho zaniżony wynik.
// Błonnik i sól są opcjonalne.
export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  salt?: number;
}
