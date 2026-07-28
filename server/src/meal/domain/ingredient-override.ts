// Ręczna korekta ilości składnika w konkretnym wpisie planera. Ilość jest
// bezwzględna (nie mnożnik) i dotyczy tylko tego jednego posiłku — sam przepis
// zostaje wzorcem.
export interface IngredientOverride {
  readonly ingredientId: string;
  readonly quantity: number;
}
