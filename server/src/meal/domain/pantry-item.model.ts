import { randomUUID } from 'crypto';

export interface PantryItemResponse {
  id: string;
  productId: string;
  name: string;
  baseUnit: string;
  packageSize?: number;
  quantity: number;
}

export class PantryItem {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly productId: string,
    readonly quantity: number,
  ) {}

  static create(householdId: string, productId: string, quantity: number): PantryItem {
    return new PantryItem(randomUUID(), householdId, productId, Math.max(0, quantity));
  }

  withQuantity(quantity: number): PantryItem {
    return new PantryItem(this.id, this.householdId, this.productId, Math.max(0, quantity));
  }
}
