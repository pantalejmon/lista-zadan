import { randomUUID } from 'crypto';
import type { ListRole } from './list-role';

export interface HouseholdResponse {
  readonly id: string;
  readonly name: string;
  readonly role: ListRole;
  readonly createdAt: number;
}

export class Household {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;

  constructor(id: string, name: string, createdAt: number) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
  }

  static create(name: string): Household {
    return new Household(randomUUID(), name, Date.now());
  }

  static createPersonal(): Household {
    return new Household(randomUUID(), 'Moje gospodarstwo', Date.now());
  }

  rename(name: string): Household {
    return new Household(this.id, name, this.createdAt);
  }

  toResponse(role: ListRole): HouseholdResponse {
    return {
      id: this.id,
      name: this.name,
      role,
      createdAt: this.createdAt,
    };
  }
}
