import { randomUUID } from 'crypto';
import { CreateProductDto } from '../web/dto/create-product.dto';

export type BaseUnit = 'g' | 'ml' | 'szt';

export interface ProductResponse {
  id: string;
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packageSize?: number;
  trackInPantry: boolean;
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
    };
  }
}
