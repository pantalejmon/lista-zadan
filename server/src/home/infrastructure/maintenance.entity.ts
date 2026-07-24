import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Maintenance } from '../domain/maintenance.model';

@Entity('home_maintenance')
export class MaintenanceEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Index()
  @Column('varchar')
  assetId!: string;

  @Column('varchar')
  type!: string;

  @Column('int', { nullable: true })
  intervalMonths!: number | null;

  @Column('varchar', { nullable: true })
  lastDoneAt!: string | null;

  @Column('varchar', { nullable: true })
  nextDueAt!: string | null;

  @Column('float', { nullable: true })
  cost!: number | null;

  @Column('varchar', { nullable: true })
  notes!: string | null;

  @Column('bigint')
  createdAt!: number;

  toDomain(): Maintenance {
    return new Maintenance(
      this.id,
      this.householdId,
      this.assetId,
      this.type,
      this.intervalMonths === null ? null : Number(this.intervalMonths),
      this.lastDoneAt,
      this.nextDueAt,
      this.cost === null ? null : Number(this.cost),
      this.notes,
      Number(this.createdAt),
    );
  }

  static fromDomain(maintenance: Maintenance): MaintenanceEntity {
    const entity = new MaintenanceEntity();
    entity.id = maintenance.id;
    entity.householdId = maintenance.householdId;
    entity.assetId = maintenance.assetId;
    entity.type = maintenance.type;
    entity.intervalMonths = maintenance.intervalMonths;
    entity.lastDoneAt = maintenance.lastDoneAt;
    entity.nextDueAt = maintenance.nextDueAt;
    entity.cost = maintenance.cost;
    entity.notes = maintenance.notes;
    entity.createdAt = maintenance.createdAt;
    return entity;
  }
}
