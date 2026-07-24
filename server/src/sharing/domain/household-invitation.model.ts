import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface HouseholdInvitationResponse {
  readonly id: string;
  readonly householdId: string;
  readonly householdName: string;
  readonly invitedByName: string;
  readonly invitedEmail: string;
  readonly role: ListRole;
  readonly status: InvitationStatus;
  readonly createdAt: number;
}

export class HouseholdInvitation {
  readonly id: string;
  readonly householdId: string;
  readonly invitedByUserId: string;
  readonly invitedEmail: string;
  readonly role: ListRole;
  readonly status: InvitationStatus;
  readonly createdAt: number;

  constructor(
    id: string,
    householdId: string,
    invitedByUserId: string,
    invitedEmail: string,
    role: ListRole,
    status: InvitationStatus,
    createdAt: number,
  ) {
    this.id = id;
    this.householdId = householdId;
    this.invitedByUserId = invitedByUserId;
    this.invitedEmail = invitedEmail;
    this.role = role;
    this.status = status;
    this.createdAt = createdAt;
  }

  static create(
    householdId: string,
    invitedByUserId: string,
    email: string,
    role: ListRole,
  ): HouseholdInvitation {
    return new HouseholdInvitation(
      randomUUID(),
      householdId,
      invitedByUserId,
      email,
      role,
      'pending',
      Date.now(),
    );
  }

  accept(): HouseholdInvitation {
    return new HouseholdInvitation(
      this.id, this.householdId, this.invitedByUserId, this.invitedEmail,
      this.role, 'accepted', this.createdAt,
    );
  }

  decline(): HouseholdInvitation {
    return new HouseholdInvitation(
      this.id, this.householdId, this.invitedByUserId, this.invitedEmail,
      this.role, 'declined', this.createdAt,
    );
  }
}
