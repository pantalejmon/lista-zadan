import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export interface ListMemberResponse {
  readonly id: string;
  readonly listId: string;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: ListRole;
  readonly joinedAt: number;
}

export class ListMember {
  readonly id: string;
  readonly listId: string;
  readonly userId: string;
  readonly role: ListRole;
  readonly joinedAt: number;

  constructor(
    id: string,
    listId: string,
    userId: string,
    role: ListRole,
    joinedAt: number,
  ) {
    this.id = id;
    this.listId = listId;
    this.userId = userId;
    this.role = role;
    this.joinedAt = joinedAt;
  }

  static create(listId: string, userId: string, role: ListRole): ListMember {
    return new ListMember(randomUUID(), listId, userId, role, Date.now());
  }
}
