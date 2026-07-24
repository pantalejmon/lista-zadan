import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { MealShoppingItem } from '../domain/meal-shopping-item.model';

@Entity('meal_shopping_item')
export class MealShoppingItemEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  name!: string;

  @Column('float', { nullable: true })
  quantity!: number | null;

  @Column('varchar', { nullable: true })
  unit!: string | null;

  @Column('boolean', { default: false })
  isChecked!: boolean;

  @Column('bigint')
  createdAt!: number;

  toDomain(): MealShoppingItem {
    return new MealShoppingItem(
      this.id,
      this.householdId,
      this.name,
      this.quantity === null ? null : Number(this.quantity),
      this.unit,
      this.isChecked,
      Number(this.createdAt),
    );
  }

  static fromDomain(item: MealShoppingItem): MealShoppingItemEntity {
    const entity = new MealShoppingItemEntity();
    entity.id = item.id;
    entity.householdId = item.householdId;
    entity.name = item.name;
    entity.quantity = item.quantity;
    entity.unit = item.unit;
    entity.isChecked = item.isChecked;
    entity.createdAt = item.createdAt;
    return entity;
  }
}
