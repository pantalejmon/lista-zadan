import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ListInvitation, type InvitationStatus } from '../domain/list-invitation.model';
import type { ListRole } from '../domain/list-role';

@Entity('list_invitation')
export class ListInvitationEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  listId!: string;

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

  toDomain(): ListInvitation {
    return new ListInvitation(
      this.id, this.listId, this.invitedByUserId, this.invitedEmail,
      this.role, this.status, Number(this.createdAt),
    );
  }

  static fromDomain(model: ListInvitation): ListInvitationEntity {
    const entity = new ListInvitationEntity();
    entity.id = model.id;
    entity.listId = model.listId;
    entity.invitedByUserId = model.invitedByUserId;
    entity.invitedEmail = model.invitedEmail;
    entity.role = model.role;
    entity.status = model.status;
    entity.createdAt = model.createdAt;
    return entity;
  }
}
