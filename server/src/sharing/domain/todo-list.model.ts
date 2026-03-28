import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export interface TodoListResponse {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly isDefault: boolean;
  readonly role: ListRole;
  readonly createdAt: number;
}

export class TodoList {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly isDefault: boolean;
  readonly createdAt: number;

  constructor(
    id: string,
    name: string,
    ownerId: string,
    isDefault: boolean,
    createdAt: number,
  ) {
    this.id = id;
    this.name = name;
    this.ownerId = ownerId;
    this.isDefault = isDefault;
    this.createdAt = createdAt;
  }

  static createDefault(ownerId: string): TodoList {
    return new TodoList(randomUUID(), 'Moja lista', ownerId, true, Date.now());
  }

  static createCustom(name: string, ownerId: string): TodoList {
    return new TodoList(randomUUID(), name, ownerId, false, Date.now());
  }

  rename(name: string): TodoList {
    return new TodoList(this.id, name, this.ownerId, this.isDefault, this.createdAt);
  }

  toResponse(role: ListRole): TodoListResponse {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      isDefault: this.isDefault,
      role,
      createdAt: this.createdAt,
    };
  }
}
