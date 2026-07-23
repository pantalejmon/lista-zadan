export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date?: string; // YYYY-MM-DD (null for unassigned todos)
  time?: string; // HH:mm
  createdAt: number;
  recurrenceGroupId?: string; // links all instances of a recurring todo
  listId?: string;
  month?: string; // YYYY-MM (set on unassigned todos)
  updatedAt?: number;
}

export interface RecurrenceConfig {
  type: RecurrenceType;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export type ListRole = 'owner' | 'editor' | 'viewer';

export interface TodoList {
  id: string;
  name: string;
  ownerId: string;
  householdId: string;
  householdName: string;
  isDefault: boolean;
  role: ListRole;
  createdAt: number;
}

export interface Household {
  id: string;
  name: string;
  role: ListRole;
  createdAt: number;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  email: string;
  displayName: string;
  role: ListRole;
  joinedAt: number;
}

export interface ContactSuggestion {
  userId: string;
  email: string;
  displayName: string;
}

export interface HouseholdInvitation {
  id: string;
  householdId: string;
  householdName: string;
  invitedByName: string;
  invitedEmail: string;
  role: ListRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}
