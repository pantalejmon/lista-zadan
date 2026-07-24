import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { PantryItem } from '../domain/pantry-item.model';

@Entity('meal_pantry_item')
export class PantryItemEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  productId!: string;

  @Column('float')
  quantity!: number;

  toDomain(): PantryItem {
    return new PantryItem(this.id, this.householdId, this.productId, Number(this.quantity));
  }

  static fromDomain(item: PantryItem): PantryItemEntity {
    const entity = new PantryItemEntity();
    entity.id = item.id;
    entity.householdId = item.householdId;
    entity.productId = item.productId;
    entity.quantity = item.quantity;
    return entity;
  }
}
