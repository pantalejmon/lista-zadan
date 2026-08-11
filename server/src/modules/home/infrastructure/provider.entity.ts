import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Provider } from '../domain/provider.model';

@Entity('home_provider')
export class ProviderEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar', { nullable: true })
  trade!: string | null;

  @Column('varchar', { nullable: true })
  phone!: string | null;

  @Column('varchar', { nullable: true })
  email!: string | null;

  @Column('varchar', { nullable: true })
  notes!: string | null;

  @Column('bigint')
  createdAt!: number;

  toDomain(): Provider {
    return new Provider(
      this.id,
      this.householdId,
      this.name,
      this.trade,
      this.phone,
      this.email,
      this.notes,
      Number(this.createdAt),
    );
  }

  static fromDomain(provider: Provider): ProviderEntity {
    const entity = new ProviderEntity();
    entity.id = provider.id;
    entity.householdId = provider.householdId;
    entity.name = provider.name;
    entity.trade = provider.trade;
    entity.phone = provider.phone;
    entity.email = provider.email;
    entity.notes = provider.notes;
    entity.createdAt = provider.createdAt;
    return entity;
  }
}
