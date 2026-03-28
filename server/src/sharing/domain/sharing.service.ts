import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ListRole } from './list-role';
import { TodoList, type TodoListResponse } from './todo-list.model';
import { ListMember, type ListMemberResponse } from './list-member.model';
import { ListInvitation, type ListInvitationResponse } from './list-invitation.model';
import { TodoListRepositoryPort } from './todo-list.repository.port';
import { ListMemberRepositoryPort } from './list-member.repository.port';
import { ListInvitationRepositoryPort } from './list-invitation.repository.port';
import { AuthService } from '../../auth/domain/auth.service';

export class SharingService {
  constructor(
    private readonly listRepo: TodoListRepositoryPort,
    private readonly memberRepo: ListMemberRepositoryPort,
    private readonly invitationRepo: ListInvitationRepositoryPort,
    private readonly authService: AuthService,
  ) {}

  async getListsForUser(userId: string): Promise<TodoListResponse[]> {
    const memberships = await this.memberRepo.findByUserId(userId);
    if (memberships.length === 0) {
      await this.createDefaultList(userId);
      return this.getListsForUser(userId);
    }

    const results: TodoListResponse[] = [];
    for (const membership of memberships) {
      const list = await this.listRepo.findById(membership.listId);
      if (list) {
        results.push(list.toResponse(membership.role));
      }
    }
    return results;
  }

  async createList(name: string, userId: string): Promise<TodoListResponse> {
    const list = TodoList.createCustom(name, userId);
    await this.listRepo.save(list);
    const member = ListMember.create(list.id, userId, 'owner');
    await this.memberRepo.save(member);
    return list.toResponse('owner');
  }

  async createDefaultList(userId: string): Promise<TodoListResponse> {
    const existing = await this.listRepo.findDefaultByUser(userId);
    if (existing) {
      return existing.toResponse('owner');
    }
    const list = TodoList.createDefault(userId);
    await this.listRepo.save(list);
    const member = ListMember.create(list.id, userId, 'owner');
    await this.memberRepo.save(member);
    return list.toResponse('owner');
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
    await this.assertPermission(listId, userId, ['owner']);
    const list = await this.findListOrThrow(listId);
    const updated = list.rename(name);
    await this.listRepo.update(updated);
    return updated.toResponse('owner');
  }

  async deleteList(listId: string, userId: string): Promise<void> {
    const list = await this.findListOrThrow(listId);
    if (list.isDefault) {
      throw new BadRequestException('Cannot delete the default list');
    }
    await this.assertPermission(listId, userId, ['owner']);
    await this.invitationRepo.deleteByListId(listId);
    await this.memberRepo.deleteByListId(listId);
    await this.listRepo.delete(listId);
  }

  async getMembers(listId: string, userId: string): Promise<ListMemberResponse[]> {
    await this.assertPermission(listId, userId, ['owner', 'editor', 'viewer']);
    const members = await this.memberRepo.findByListId(listId);
    const results: ListMemberResponse[] = [];
    for (const member of members) {
      const user = await this.authService.findUserById(member.userId);
      results.push({
        id: member.id,
        listId: member.listId,
        userId: member.userId,
        email: user?.email ?? '',
        displayName: user?.displayName ?? '',
        role: member.role,
        joinedAt: member.joinedAt,
      });
    }
    return results;
  }

  async removeMember(listId: string, memberId: string, userId: string): Promise<void> {
    await this.assertPermission(listId, userId, ['owner']);
    await this.memberRepo.delete(memberId);
  }

  async inviteToList(
    listId: string,
    email: string,
    role: ListRole,
    userId: string,
  ): Promise<ListInvitationResponse> {
    await this.assertPermission(listId, userId, ['owner', 'editor']);
    const list = await this.findListOrThrow(listId);
    const inviter = await this.authService.findUserById(userId);
    const invitation = ListInvitation.create(listId, userId, email, role);
    await this.invitationRepo.save(invitation);
    return {
      id: invitation.id,
      listId: invitation.listId,
      listName: list.name,
      invitedByName: inviter?.displayName ?? '',
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
    };
  }

  async getPendingInvitations(userEmail: string): Promise<ListInvitationResponse[]> {
    const invitations = await this.invitationRepo.findPendingByEmail(userEmail);
    const results: ListInvitationResponse[] = [];
    for (const inv of invitations) {
      const list = await this.listRepo.findById(inv.listId);
      const inviter = await this.authService.findUserById(inv.invitedByUserId);
      results.push({
        id: inv.id,
        listId: inv.listId,
        listName: list?.name ?? '',
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
    const member = ListMember.create(invitation.listId, userId, invitation.role);
    await this.memberRepo.save(member);
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

  async assertPermission(listId: string, userId: string, requiredRoles: ListRole[]): Promise<void> {
    const member = await this.memberRepo.findByListAndUser(listId, userId);
    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions for this list');
    }
  }

  async getUserRole(listId: string, userId: string): Promise<ListRole | null> {
    const member = await this.memberRepo.findByListAndUser(listId, userId);
    return member?.role ?? null;
  }

  private async findListOrThrow(listId: string): Promise<TodoList> {
    const list = await this.listRepo.findById(listId);
    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }
    return list;
  }

  private async findInvitationOrThrow(id: string): Promise<ListInvitation> {
    const invitation = await this.invitationRepo.findById(id);
    if (!invitation) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
    return invitation;
  }
}
