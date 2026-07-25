import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export interface TodoListResponse {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly householdId: string;
  readonly householdName: string;
  readonly isDefault: boolean;
  readonly role: ListRole;
  readonly createdAt: number;
}

export class TodoList {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly householdId: string;
  readonly isDefault: boolean;
  readonly createdAt: number;

  constructor(
    id: string,
    name: string,
    ownerId: string,
    householdId: string,
    isDefault: boolean,
    createdAt: number,
  ) {
    this.id = id;
    this.name = name;
    this.ownerId = ownerId;
    this.householdId = householdId;
    this.isDefault = isDefault;
    this.createdAt = createdAt;
  }

  static createDefault(ownerId: string, householdId: string): TodoList {
    return new TodoList(randomUUID(), 'Moja lista', ownerId, householdId, true, Date.now());
  }

  static createCustom(name: string, ownerId: string, householdId: string): TodoList {
    return new TodoList(randomUUID(), name, ownerId, householdId, false, Date.now());
  }

  rename(name: string): TodoList {
    return new TodoList(this.id, name, this.ownerId, this.householdId, this.isDefault, this.createdAt);
  }

  moveToHousehold(householdId: string): TodoList {
    return new TodoList(this.id, this.name, this.ownerId, householdId, this.isDefault, this.createdAt);
  }

  toResponse(role: ListRole, householdName: string): TodoListResponse {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      householdId: this.householdId,
      householdName,
      isDefault: this.isDefault,
      role,
      createdAt: this.createdAt,
    };
  }
}
