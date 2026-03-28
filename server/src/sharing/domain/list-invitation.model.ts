import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface ListInvitationResponse {
  readonly id: string;
  readonly listId: string;
  readonly listName: string;
  readonly invitedByName: string;
  readonly invitedEmail: string;
  readonly role: ListRole;
  readonly status: InvitationStatus;
  readonly createdAt: number;
}

export class ListInvitation {
  readonly id: string;
  readonly listId: string;
  readonly invitedByUserId: string;
  readonly invitedEmail: string;
  readonly role: ListRole;
  readonly status: InvitationStatus;
  readonly createdAt: number;

  constructor(
    id: string,
    listId: string,
    invitedByUserId: string,
    invitedEmail: string,
    role: ListRole,
    status: InvitationStatus,
    createdAt: number,
  ) {
    this.id = id;
    this.listId = listId;
    this.invitedByUserId = invitedByUserId;
    this.invitedEmail = invitedEmail;
    this.role = role;
    this.status = status;
    this.createdAt = createdAt;
  }

  static create(
    listId: string,
    invitedByUserId: string,
    email: string,
    role: ListRole,
  ): ListInvitation {
    return new ListInvitation(
      randomUUID(),
      listId,
      invitedByUserId,
      email,
      role,
      'pending',
      Date.now(),
    );
  }

  accept(): ListInvitation {
    return new ListInvitation(
      this.id, this.listId, this.invitedByUserId, this.invitedEmail,
      this.role, 'accepted', this.createdAt,
    );
  }

  decline(): ListInvitation {
    return new ListInvitation(
      this.id, this.listId, this.invitedByUserId, this.invitedEmail,
      this.role, 'declined', this.createdAt,
    );
  }
}
