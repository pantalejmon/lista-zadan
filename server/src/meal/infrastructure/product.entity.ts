import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Product, BaseUnit } from '../domain/product.model';
import { Nutrition } from '../domain/nutrition';

@Entity('meal_product')
export class ProductEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar', { nullable: true })
  category!: string | null;

  @Column('varchar', { default: 'szt' })
  baseUnit!: BaseUnit;

  @Column('float', { nullable: true })
  packageSize!: number | null;

  @Column('boolean', { default: true })
  trackInPantry!: boolean;

  // Wartości odżywcze na 100 g/ml (albo na 1 szt) — patrz domain/nutrition.ts.
  // Rozpłaszczone do kolumn, bo makro filtruje się i sumuje po stronie bazy.
  @Column('float', { nullable: true })
  kcal!: number | null;

  @Column('float', { nullable: true })
  protein!: number | null;

  @Column('float', { nullable: true })
  fat!: number | null;

  @Column('float', { nullable: true })
  carbs!: number | null;

  @Column('float', { nullable: true })
  fiber!: number | null;

  @Column('float', { nullable: true })
  salt!: number | null;

  toDomain(): Product {
    return new Product(
      this.id,
      this.householdId,
      this.name,
      this.category,
      this.baseUnit,
      this.packageSize === null ? null : Number(this.packageSize),
      this.trackInPantry,
      this.toNutrition(),
    );
  }

  static fromDomain(product: Product): ProductEntity {
    const entity = new ProductEntity();
    entity.id = product.id;
    entity.householdId = product.householdId;
    entity.name = product.name;
    entity.category = product.category;
    entity.baseUnit = product.baseUnit;
    entity.packageSize = product.packageSize;
    entity.trackInPantry = product.trackInPantry;
    entity.kcal = product.nutrition?.kcal ?? null;
    entity.protein = product.nutrition?.protein ?? null;
    entity.fat = product.nutrition?.fat ?? null;
    entity.carbs = product.nutrition?.carbs ?? null;
    entity.fiber = product.nutrition?.fiber ?? null;
    entity.salt = product.nutrition?.salt ?? null;
    return entity;
  }

  // Makro zapisuje się kompletem (kcal + 3 makroskładniki), więc brak kcal =
  // produkt bez wartości odżywczych. Pozostałe pola i tak domykamy zerem, żeby
  // ręcznie dopisany wiersz nie wywrócił liczenia.
  private toNutrition(): Nutrition | null {
    if (this.kcal === null) {
      return null;
    }
    return {
      kcal: Number(this.kcal),
      protein: Number(this.protein ?? 0),
      fat: Number(this.fat ?? 0),
      carbs: Number(this.carbs ?? 0),
      fiber: this.fiber === null ? undefined : Number(this.fiber),
      salt: this.salt === null ? undefined : Number(this.salt),
    };
  }
}
