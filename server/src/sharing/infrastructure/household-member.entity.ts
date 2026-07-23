import { Entity, PrimaryColumn, Column } from 'typeorm';
import { HouseholdMember } from '../domain/household-member.model';
import type { ListRole } from '../domain/list-role';

@Entity('household_member')
export class HouseholdMemberEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  userId!: string;

  @Column('varchar')
  role!: ListRole;

  @Column('bigint')
  joinedAt!: number;

  toDomain(): HouseholdMember {
    return new HouseholdMember(this.id, this.householdId, this.userId, this.role, Number(this.joinedAt));
  }

  static fromDomain(model: HouseholdMember): HouseholdMemberEntity {
    const entity = new HouseholdMemberEntity();
    entity.id = model.id;
    entity.householdId = model.householdId;
    entity.userId = model.userId;
    entity.role = model.role;
    entity.joinedAt = model.joinedAt;
    return entity;
  }
}
