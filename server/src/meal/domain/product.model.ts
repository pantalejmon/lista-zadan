import { randomUUID } from 'crypto';
import { CreateProductDto } from '../web/dto/create-product.dto';
import { NutritionDto } from '../web/dto/nutrition.dto';
import { Nutrition } from './nutrition';

export type BaseUnit = 'g' | 'ml' | 'szt';

export interface ProductResponse {
  id: string;
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packageSize?: number;
  trackInPantry: boolean;
  nutrition?: Nutrition;
}

export class Product {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly name: string,
    readonly category: string | null,
    readonly baseUnit: BaseUnit,
    readonly packageSize: number | null,
    readonly trackInPantry: boolean,
    readonly nutrition: Nutrition | null,
  ) {}

  static createFromDto(dto: CreateProductDto, householdId: string): Product {
    return new Product(
      randomUUID(),
      householdId,
      dto.name.trim(),
      dto.category?.trim() ? dto.category.trim() : null,
      dto.baseUnit,
      typeof dto.packageSize === 'number' && dto.packageSize > 0 ? dto.packageSize : null,
      dto.trackInPantry ?? true,
      normaliseNutrition(dto.nutrition),
    );
  }

  update(dto: CreateProductDto): Product {
    return new Product(
      this.id,
      this.householdId,
      dto.name.trim(),
      dto.category?.trim() ? dto.category.trim() : null,
      dto.baseUnit,
      typeof dto.packageSize === 'number' && dto.packageSize > 0 ? dto.packageSize : null,
      dto.trackInPantry ?? true,
      normaliseNutrition(dto.nutrition),
    );
  }

  toResponse(): ProductResponse {
    return {
      id: this.id,
      name: this.name,
      category: this.category ?? undefined,
      baseUnit: this.baseUnit,
      packageSize: this.packageSize ?? undefined,
      trackInPantry: this.trackInPantry,
      nutrition: this.nutrition ?? undefined,
    };
  }
}

function normaliseNutrition(dto: NutritionDto | undefined): Nutrition | null {
  if (!dto) {
    return null;
  }
  return {
    kcal: dto.kcal,
    protein: dto.protein,
    fat: dto.fat,
    carbs: dto.carbs,
    fiber: dto.fiber ?? undefined,
    salt: dto.salt ?? undefined,
  };
}
