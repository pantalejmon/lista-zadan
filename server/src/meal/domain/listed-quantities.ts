// Ilości jednej pozycji leżące (niekupione) na liście zakupów, w rozbiciu na
// jednostki. Odpowiada na jedno pytanie: „ile z brakującej ilości user już sobie
// dopisał?" — patrz `MealService.shoppingListCoverage`.
export class ListedQuantities {
  private readonly byUnit = new Map<string, number>();
  private unknownQty = false;

  // Pozycja bez ilości („mleko", dopisane ręcznie) nie wnosi liczby, tylko
  // sygnał, że temat jest na liście.
  add(quantity: number | null, unit: string | null): void {
    if (!quantity || quantity <= 0) {
      this.unknownQty = true;
      return;
    }
    const key = normaliseUnit(unit);
    this.byUnit.set(key, (this.byUnit.get(key) ?? 0) + quantity);
  }

  // Ilość, którą da się odjąć od potrzeby w danej jednostce: pozycje w tej samej
  // jednostce plus te, które jednostki nie podają.
  quantityIn(unit: string): number {
    const key = normaliseUnit(unit);
    const sameUnit = this.byUnit.get(key) ?? 0;
    return key === '' ? sameUnit : sameUnit + (this.byUnit.get('') ?? 0);
  }

  // `true`, gdy na liście jest coś, czego nie umiemy odjąć: pozycja bez ilości
  // albo w innej jednostce („2 opak." wobec potrzeby w gramach). Skoro user sam
  // to dopisał, uznajemy potrzebę za załatwioną, zamiast dokładać drugi raz.
  hasUncountable(unit: string): boolean {
    if (this.unknownQty) {
      return true;
    }
    const key = normaliseUnit(unit);
    return [...this.byUnit.keys()].some((u) => u !== '' && u !== key);
  }
}

function normaliseUnit(unit: string | null): string {
  return unit?.trim().toLowerCase() ?? '';
}
