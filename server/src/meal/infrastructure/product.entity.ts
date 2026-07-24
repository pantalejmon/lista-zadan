import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Product, BaseUnit } from '../domain/product.model';

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

  toDomain(): Product {
    return new Product(
      this.id,
      this.householdId,
      this.name,
      this.category,
      this.baseUnit,
      this.packageSize === null ? null : Number(this.packageSize),
      this.trackInPantry,
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
    return entity;
  }
}
