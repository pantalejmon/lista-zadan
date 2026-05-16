export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

export function isShoppingComplete(items: readonly ShoppingItem[]): boolean {
  return items.length > 0 && items.every((i) => i.checked);
}
