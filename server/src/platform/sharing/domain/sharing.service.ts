import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ListRole } from './list-role';
import { TodoList, type TodoListResponse } from './todo-list.model';
import { Household, type HouseholdResponse } from './household.model';
import { HouseholdMember, type HouseholdMemberResponse } from './household-member.model';
import { HouseholdInvitation, type HouseholdInvitationResponse } from './household-invitation.model';
import { TodoListRepositoryPort } from './todo-list.repository.port';
import { HouseholdRepositoryPort } from './household.repository.port';
import { HouseholdMemberRepositoryPort } from './household-member.repository.port';
import { HouseholdInvitationRepositoryPort } from './household-invitation.repository.port';
import { AuthService } from '@platform/auth/domain/auth.service';

export interface ContactSuggestion {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
}

export class SharingService {
  constructor(
    private readonly listRepo: TodoListRepositoryPort,
    private readonly householdRepo: HouseholdRepositoryPort,
    private readonly memberRepo: HouseholdMemberRepositoryPort,
    private readonly invitationRepo: HouseholdInvitationRepositoryPort,
    private readonly authService: AuthService,
  ) {}

  // ---- lists (household-scoped, list-based public surface for the todo module) ----

  async getListsForUser(userId: string): Promise<TodoListResponse[]> {
    const memberships = await this.memberRepo.findByUserId(userId);
    if (memberships.length === 0) {
      // No household yet — the client runs onboarding (setupHousehold / accept invitation).
      // We no longer auto-create a household silently.
      return [];
    }

    const householdIds = memberships.map((m) => m.householdId);
    const households = await this.householdRepo.findByIds(householdIds);
    const householdName = new Map(households.map((h) => [h.id, h.name]));
    const roleByHousehold = new Map(memberships.map((m) => [m.householdId, m.role]));

    const lists = await this.listRepo.findByHouseholdIds(householdIds);
    return lists.map((list) =>
      list.toResponse(
        roleByHousehold.get(list.householdId) ?? 'viewer',
        householdName.get(list.householdId) ?? '',
      ),
    );
  }

  async createList(name: string, userId: string, householdId?: string): Promise<TodoListResponse> {
    const household = householdId
      ? await this.findHouseholdOrThrow(householdId)
      : await this.getOrCreateDefaultHousehold(userId);
    await this.assertHouseholdPermission(household.id, userId, ['owner', 'editor']);
    const list = TodoList.createCustom(name, userId, household.id);
    await this.listRepo.save(list);
    const member = await this.memberRepo.findByHouseholdAndUser(household.id, userId);
    return list.toResponse(member?.role ?? 'owner', household.name);
  }

  async createDefaultList(userId: string): Promise<TodoListResponse> {
    const existing = await this.listRepo.findDefaultByUser(userId);
    if (existing) {
      const household = await this.householdRepo.findById(existing.householdId);
      return existing.toResponse('owner', household?.name ?? '');
    }
    const household = await this.getOrCreateDefaultHousehold(userId);
    const list = TodoList.createDefault(userId, household.id);
    await this.listRepo.save(list);
    return list.toResponse('owner', household.name);
  }

  async getDefaultListId(userId: string): Promise<string> {
    const existing = await this.listRepo.findDefaultByUser(userId);
    if (existing) {
      return existing.id;
    }
    const response = await this.createDefaultList(userId);
    return response.id;
  }

  async updateList(listId: string, name: string, userId: string): Promise<TodoListResponse> {
    const list = await this.findListOrThrow(listId);
    await this.assertHouseholdPermission(list.householdId, userId, ['owner', 'editor']);
    const updated = list.rename(name);
    await this.listRepo.update(updated);
    const household = await this.householdRepo.findById(list.householdId);
    const member = await this.memberRepo.findByHouseholdAndUser(list.householdId, userId);
    return updated.toResponse(member?.role ?? 'owner', household?.name ?? '');
  }

  // Move a list (and, implicitly, all its todos — they reference listId, not
  // householdId) into another household. Requires manage rights in BOTH the
  // source and the destination household.
  async moveList(listId: string, targetHouseholdId: string, userId: string): Promise<TodoListResponse> {
    const list = await this.findListOrThrow(listId);
    if (list.householdId === targetHouseholdId) {
      const household = await this.householdRepo.findById(list.householdId);
      const member = await this.memberRepo.findByHouseholdAndUser(list.householdId, userId);
      return list.toResponse(member?.role ?? 'owner', household?.name ?? '');
    }
    await this.assertHouseholdPermission(list.householdId, userId, ['owner', 'editor']);
    await this.assertHouseholdPermission(targetHouseholdId, userId, ['owner', 'editor']);
    const target = await this.findHouseholdOrThrow(targetHouseholdId);
    const moved = list.moveToHousehold(target.id);
    await this.listRepo.update(moved);
    const member = await this.memberRepo.findByHouseholdAndUser(target.id, userId);
    return moved.toResponse(member?.role ?? 'owner', target.name);
  }

  async deleteList(listId: string, userId: string): Promise<void> {
    const list = await this.findListOrThrow(listId);
    if (list.isDefault) {
      throw new BadRequestException('Cannot delete the default list');
    }
    await this.assertHouseholdPermission(list.householdId, userId, ['owner', 'editor']);
    await this.listRepo.delete(listId);
  }

  // ---- households ----

  async getHouseholds(userId: string): Promise<HouseholdResponse[]> {
    const memberships = await this.memberRepo.findByUserId(userId);
    const results: HouseholdResponse[] = [];
    for (const membership of memberships) {
      const household = await this.householdRepo.findById(membership.householdId);
      if (household) {
        results.push(household.toResponse(membership.role));
      }
    }
    return results;
  }

  async createHousehold(name: string, userId: string): Promise<HouseholdResponse> {
    const household = Household.create(name);
    await this.householdRepo.save(household);
    await this.memberRepo.save(HouseholdMember.create(household.id, userId, 'owner'));
    return household.toResponse('owner');
  }

  // First-login onboarding: create the user's first household + a default list.
  // Idempotent — if the user already belongs to a household, returns it without creating a duplicate.
  async setupHousehold(name: string, userId: string): Promise<HouseholdResponse> {
    const memberships = await this.memberRepo.findByUserId(userId);
    if (memberships.length > 0) {
      const existing = await this.householdRepo.findById(memberships[0].householdId);
      if (existing) {
        return existing.toResponse(memberships[0].role);
      }
    }
    const household = Household.create(name.trim() || 'Mój dom');
    await this.householdRepo.save(household);
    await this.memberRepo.save(HouseholdMember.create(household.id, userId, 'owner'));
    const list = TodoList.createDefault(userId, household.id);
    await this.listRepo.save(list);
    return household.toResponse('owner');
  }

  async renameHousehold(householdId: string, name: string, userId: string): Promise<HouseholdResponse> {
    await this.assertHouseholdPermission(householdId, userId, ['owner']);
    const household = await this.findHouseholdOrThrow(householdId);
    const updated = household.rename(name);
    await this.householdRepo.update(updated);
    return updated.toResponse('owner');
  }

  async getHouseholdMembers(householdId: string, userId: string): Promise<HouseholdMemberResponse[]> {
    await this.assertHouseholdPermission(householdId, userId, ['owner', 'editor', 'viewer']);
    const members = await this.memberRepo.findByHouseholdId(householdId);
    const results: HouseholdMemberResponse[] = [];
    for (const member of members) {
      const user = await this.authService.findUserById(member.userId);
      results.push({
        id: member.id,
        householdId: member.householdId,
        userId: member.userId,
        email: user?.email ?? '',
        displayName: user?.displayName ?? '',
        role: member.role,
        joinedAt: member.joinedAt,
      });
    }
    return results;
  }

  async removeMember(householdId: string, memberId: string, userId: string): Promise<void> {
    await this.assertHouseholdPermission(householdId, userId, ['owner']);
    const members = await this.memberRepo.findByHouseholdId(householdId);
    const target = members.find((m) => m.id === memberId);
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1) {
      throw new BadRequestException('Nie można usunąć ostatniego właściciela gospodarstwa');
    }
    await this.memberRepo.delete(memberId);
  }

  async changeMemberRole(
    householdId: string,
    memberId: string,
    role: ListRole,
    userId: string,
  ): Promise<HouseholdMemberResponse> {
    await this.assertHouseholdPermission(householdId, userId, ['owner']);
    const members = await this.memberRepo.findByHouseholdId(householdId);
    const target = members.find((m) => m.id === memberId);
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (
      target.role === 'owner' &&
      role !== 'owner' &&
      members.filter((m) => m.role === 'owner').length <= 1
    ) {
      throw new BadRequestException('Nie można zdegradować ostatniego właściciela gospodarstwa');
    }
    const updated = target.withRole(role);
    await this.memberRepo.save(updated);
    const user = await this.authService.findUserById(updated.userId);
    return {
      id: updated.id,
      householdId: updated.householdId,
      userId: updated.userId,
      email: user?.email ?? '',
      displayName: user?.displayName ?? '',
      role: updated.role,
      joinedAt: updated.joinedAt,
    };
  }

  async leaveHousehold(householdId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findByHouseholdAndUser(householdId, userId);
    if (!member) {
      throw new NotFoundException('Nie należysz do tego gospodarstwa');
    }
    if (member.role === 'owner') {
      const members = await this.memberRepo.findByHouseholdId(householdId);
      if (members.filter((m) => m.role === 'owner').length <= 1) {
        throw new BadRequestException(
          'Jesteś jedynym właścicielem — przekaż rolę właściciela innej osobie przed opuszczeniem gospodarstwa',
        );
      }
    }
    await this.memberRepo.delete(member.id);
  }

  async getContactSuggestions(userId: string): Promise<ContactSuggestion[]> {
    const memberships = await this.memberRepo.findByUserId(userId);
    const seen = new Set<string>([userId]);
    const suggestions: ContactSuggestion[] = [];
    for (const membership of memberships) {
      const members = await this.memberRepo.findByHouseholdId(membership.householdId);
      for (const member of members) {
        if (seen.has(member.userId)) {
          continue;
        }
        seen.add(member.userId);
        const user = await this.authService.findUserById(member.userId);
        if (user) {
          suggestions.push({ userId: member.userId, email: user.email, displayName: user.displayName });
        }
      }
    }
    return suggestions;
  }

  // ---- invitations (household-scoped) ----

  async inviteToHousehold(
    householdId: string,
    email: string,
    role: ListRole,
    userId: string,
  ): Promise<HouseholdInvitationResponse> {
    await this.assertHouseholdPermission(householdId, userId, ['owner', 'editor']);
    const household = await this.findHouseholdOrThrow(householdId);
    const inviter = await this.authService.findUserById(userId);
    const invitation = HouseholdInvitation.create(householdId, userId, email, role);
    await this.invitationRepo.save(invitation);
    return {
      id: invitation.id,
      householdId: invitation.householdId,
      householdName: household.name,
      invitedByName: inviter?.displayName ?? '',
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
    };
  }

  async getPendingInvitations(userEmail: string): Promise<HouseholdInvitationResponse[]> {
    const invitations = await this.invitationRepo.findPendingByEmail(userEmail);
    const results: HouseholdInvitationResponse[] = [];
    for (const inv of invitations) {
      const household = await this.householdRepo.findById(inv.householdId);
      const inviter = await this.authService.findUserById(inv.invitedByUserId);
      results.push({
        id: inv.id,
        householdId: inv.householdId,
        householdName: household?.name ?? '',
        invitedByName: inviter?.displayName ?? '',
        invitedEmail: inv.invitedEmail,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
      });
    }
    return results;
  }

  async acceptInvitation(invitationId: string, userId: string, userEmail: string): Promise<void> {
    const invitation = await this.findInvitationOrThrow(invitationId);
    if (invitation.invitedEmail !== userEmail) {
      throw new ForbiddenException('This invitation is not for you');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation is no longer pending');
    }
    const updated = invitation.accept();
    await this.invitationRepo.update(updated);
    const existing = await this.memberRepo.findByHouseholdAndUser(invitation.householdId, userId);
    if (!existing) {
      await this.memberRepo.save(
        HouseholdMember.create(invitation.householdId, userId, invitation.role),
      );
    }
  }

  async declineInvitation(invitationId: string, userEmail: string): Promise<void> {
    const invitation = await this.findInvitationOrThrow(invitationId);
    if (invitation.invitedEmail !== userEmail) {
      throw new ForbiddenException('This invitation is not for you');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation is no longer pending');
    }
    const updated = invitation.decline();
    await this.invitationRepo.update(updated);
  }

  // ---- permission seam used by the todo module (still list-based) ----

  async assertPermission(listId: string, userId: string, requiredRoles: ListRole[]): Promise<void> {
    const list = await this.listRepo.findById(listId);
    if (!list) {
      throw new ForbiddenException('Insufficient permissions for this list');
    }
    await this.assertHouseholdPermission(list.householdId, userId, requiredRoles);
  }

  async getUserRole(listId: string, userId: string): Promise<ListRole | null> {
    const list = await this.listRepo.findById(listId);
    if (!list) {
      return null;
    }
    const member = await this.memberRepo.findByHouseholdAndUser(list.householdId, userId);
    return member?.role ?? null;
  }

  // ---- internals ----

  private async getOrCreateDefaultHousehold(userId: string): Promise<Household> {
    const defaultList = await this.listRepo.findDefaultByUser(userId);
    if (defaultList) {
      const household = await this.householdRepo.findById(defaultList.householdId);
      if (household) {
        return household;
      }
    }
    const memberships = await this.memberRepo.findByUserId(userId);
    if (memberships.length > 0) {
      const household = await this.householdRepo.findById(memberships[0].householdId);
      if (household) {
        return household;
      }
    }
    const household = Household.createPersonal();
    await this.householdRepo.save(household);
    await this.memberRepo.save(HouseholdMember.create(household.id, userId, 'owner'));
    return household;
  }

  async assertHouseholdPermission(
    householdId: string,
    userId: string,
    requiredRoles: ListRole[],
  ): Promise<void> {
    const member = await this.memberRepo.findByHouseholdAndUser(householdId, userId);
    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions for this household');
    }
  }

  private async findListOrThrow(listId: string): Promise<TodoList> {
    const list = await this.listRepo.findById(listId);
    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }
    return list;
  }

  private async findHouseholdOrThrow(householdId: string): Promise<Household> {
    const household = await this.householdRepo.findById(householdId);
    if (!household) {
      throw new NotFoundException(`Household ${householdId} not found`);
    }
    return household;
  }

  private async findInvitationOrThrow(id: string): Promise<HouseholdInvitation> {
    const invitation = await this.invitationRepo.findById(id);
    if (!invitation) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
    return invitation;
  }
}
