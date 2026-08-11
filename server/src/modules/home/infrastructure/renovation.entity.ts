import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Renovation, RenovationStatus, ChecklistItem } from '../domain/renovation.model';

@Entity('home_renovation')
export class RenovationEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  title!: string;

  @Column('varchar')
  status!: RenovationStatus;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('float', { nullable: true })
  budget!: number | null;

  @Column('float', { nullable: true })
  cost!: number | null;

  // Checklist stored as a JSON string (parameterless-constructor-friendly).
  @Column('text')
  checklist!: string;

  @Column('bigint')
  createdAt!: number;

  @Column('bigint')
  updatedAt!: number;

  toDomain(): Renovation {
    const checklist = this.checklist ? (JSON.parse(this.checklist) as ChecklistItem[]) : [];
    return new Renovation(
      this.id,
      this.householdId,
      this.title,
      this.status,
      this.description,
      this.budget === null ? null : Number(this.budget),
      this.cost === null ? null : Number(this.cost),
      checklist,
      Number(this.createdAt),
      Number(this.updatedAt),
    );
  }

  static fromDomain(renovation: Renovation): RenovationEntity {
    const entity = new RenovationEntity();
    entity.id = renovation.id;
    entity.householdId = renovation.householdId;
    entity.title = renovation.title;
    entity.status = renovation.status;
    entity.description = renovation.description;
    entity.budget = renovation.budget;
    entity.cost = renovation.cost;
    entity.checklist = JSON.stringify(renovation.checklist);
    entity.createdAt = renovation.createdAt;
    entity.updatedAt = renovation.updatedAt;
    return entity;
  }
}
