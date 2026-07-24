import { Entity, PrimaryColumn, Column } from 'typeorm';
import { HouseholdInvitation, type InvitationStatus } from '../domain/household-invitation.model';
import type { ListRole } from '../domain/list-role';

@Entity('household_invitation')
export class HouseholdInvitationEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  invitedByUserId!: string;

  @Column('varchar')
  invitedEmail!: string;

  @Column('varchar')
  role!: ListRole;

  @Column('varchar', { default: 'pending' })
  status!: InvitationStatus;

  @Column('bigint')
  createdAt!: number;

  toDomain(): HouseholdInvitation {
    return new HouseholdInvitation(
      this.id, this.householdId, this.invitedByUserId, this.invitedEmail,
      this.role, this.status, Number(this.createdAt),
    );
  }

  static fromDomain(model: HouseholdInvitation): HouseholdInvitationEntity {
    const entity = new HouseholdInvitationEntity();
    entity.id = model.id;
    entity.householdId = model.householdId;
    entity.invitedByUserId = model.invitedByUserId;
    entity.invitedEmail = model.invitedEmail;
    entity.role = model.role;
    entity.status = model.status;
    entity.createdAt = model.createdAt;
    return entity;
  }
}
