// Typy gospodarstw domowych: listy zadań, członkowie, zaproszenia, role.
// Wspólne dla wszystkich modułów — każdy z nich działa w kontekście gospodarstwa.

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
