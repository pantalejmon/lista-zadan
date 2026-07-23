import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export interface HouseholdMemberResponse {
  readonly id: string;
  readonly householdId: string;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: ListRole;
  readonly joinedAt: number;
}

export class HouseholdMember {
  readonly id: string;
  readonly householdId: string;
  readonly userId: string;
  readonly role: ListRole;
  readonly joinedAt: number;

  constructor(
    id: string,
    householdId: string,
    userId: string,
    role: ListRole,
    joinedAt: number,
  ) {
    this.id = id;
    this.householdId = householdId;
    this.userId = userId;
    this.role = role;
    this.joinedAt = joinedAt;
  }

  static create(householdId: string, userId: string, role: ListRole): HouseholdMember {
    return new HouseholdMember(randomUUID(), householdId, userId, role, Date.now());
  }
}
