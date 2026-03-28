import { ListInvitation } from './list-invitation.model';

export abstract class ListInvitationRepositoryPort {
  abstract findById(id: string): Promise<ListInvitation | null>;
  abstract findByListId(listId: string): Promise<ListInvitation[]>;
  abstract findPendingByEmail(email: string): Promise<ListInvitation[]>;
  abstract save(invitation: ListInvitation): Promise<void>;
  abstract update(invitation: ListInvitation): Promise<void>;
  abstract deleteByListId(listId: string): Promise<void>;
}
