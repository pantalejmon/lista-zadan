import type {
  TodoList,
  Household,
  HouseholdMember,
  HouseholdInvitation,
  ContactSuggestion,
  ListRole,
} from './household.types';
import { request } from '@platform/api/http';

// REST gospodarstw: listy zadań, gospodarstwa, członkowie i zaproszenia.

export async function getLists(): Promise<TodoList[]> {
  return request<TodoList[]>('/lists');
}

export async function createList(name: string, householdId?: string): Promise<TodoList> {
  return request<TodoList>('/lists', {
    method: 'POST',
    body: JSON.stringify({ name, householdId }),
  });
}

export async function updateList(listId: string, name: string): Promise<TodoList> {
  return request<TodoList>(`/lists/${listId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function moveList(listId: string, householdId: string): Promise<TodoList> {
  return request<TodoList>(`/lists/${listId}/household`, {
    method: 'PATCH',
    body: JSON.stringify({ householdId }),
  });
}

export async function deleteList(listId: string): Promise<void> {
  return request(`/lists/${listId}`, { method: 'DELETE' });
}

// --- Households ---

export async function getHouseholds(): Promise<Household[]> {
  return request<Household[]>('/households');
}

export async function createHousehold(name: string): Promise<Household> {
  return request<Household>('/households', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function setupHousehold(name: string): Promise<Household> {
  return request<Household>('/households/setup', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function renameHousehold(householdId: string, name: string): Promise<Household> {
  return request<Household>(`/households/${householdId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  return request<HouseholdMember[]>(`/households/${householdId}/members`);
}

export async function removeHouseholdMember(householdId: string, memberId: string): Promise<void> {
  return request(`/households/${householdId}/members/${memberId}`, { method: 'DELETE' });
}

export async function changeMemberRole(
  householdId: string,
  memberId: string,
  role: ListRole,
): Promise<HouseholdMember> {
  return request<HouseholdMember>(`/households/${householdId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function leaveHousehold(householdId: string): Promise<void> {
  return request(`/households/${householdId}/leave`, { method: 'POST' });
}

export async function inviteToHousehold(
  householdId: string,
  email: string,
  role: ListRole,
): Promise<HouseholdInvitation> {
  return request<HouseholdInvitation>(`/households/${householdId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function getContactSuggestions(): Promise<ContactSuggestion[]> {
  return request<ContactSuggestion[]>('/contacts/suggestions');
}


// --- Invitations ---

export async function getPendingInvitations(): Promise<HouseholdInvitation[]> {
  return request<HouseholdInvitation[]>('/invitations/pending');
}

export async function acceptInvitation(id: string): Promise<void> {
  return request(`/invitations/${id}/accept`, { method: 'POST' });
}

export async function declineInvitation(id: string): Promise<void> {
  return request(`/invitations/${id}/decline`, { method: 'POST' });
}
