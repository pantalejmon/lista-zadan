import { Entity, PrimaryColumn, Column } from 'typeorm';
import { Household } from '../domain/household.model';

@Entity('household')
export class HouseholdEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('bigint')
  createdAt!: number;

  toDomain(): Household {
    return new Household(this.id, this.name, Number(this.createdAt));
  }

  static fromDomain(model: Household): HouseholdEntity {
    const entity = new HouseholdEntity();
    entity.id = model.id;
    entity.name = model.name;
    entity.createdAt = model.createdAt;
    return entity;
  }
}
