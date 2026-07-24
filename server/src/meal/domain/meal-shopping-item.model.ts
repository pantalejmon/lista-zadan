import { randomUUID } from 'crypto';

export interface MealShoppingItemResponse {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  isChecked: boolean;
  createdAt: number;
}

export class MealShoppingItem {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly name: string,
    readonly quantity: number | null,
    readonly unit: string | null,
    readonly isChecked: boolean,
    readonly createdAt: number,
  ) {}

  static create(
    householdId: string,
    name: string,
    quantity?: number | null,
    unit?: string | null,
  ): MealShoppingItem {
    return new MealShoppingItem(
      randomUUID(),
      householdId,
      name.trim(),
      quantity ?? null,
      unit?.trim() ? unit.trim() : null,
      false,
      Date.now(),
    );
  }

  withChecked(isChecked: boolean): MealShoppingItem {
    return new MealShoppingItem(
      this.id,
      this.householdId,
      this.name,
      this.quantity,
      this.unit,
      isChecked,
      this.createdAt,
    );
  }

  toResponse(): MealShoppingItemResponse {
    return {
      id: this.id,
      name: this.name,
      quantity: this.quantity ?? undefined,
      unit: this.unit ?? undefined,
      isChecked: this.isChecked,
      createdAt: this.createdAt,
    };
  }
}
