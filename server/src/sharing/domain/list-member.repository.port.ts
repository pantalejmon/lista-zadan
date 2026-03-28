import { ListMember } from './list-member.model';

export abstract class ListMemberRepositoryPort {
  abstract findByListId(listId: string): Promise<ListMember[]>;
  abstract findByUserId(userId: string): Promise<ListMember[]>;
  abstract findByListAndUser(listId: string, userId: string): Promise<ListMember | null>;
  abstract save(member: ListMember): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByListId(listId: string): Promise<void>;
}
