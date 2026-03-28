import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListMemberRepositoryPort } from '../domain/list-member.repository.port';
import { ListMember } from '../domain/list-member.model';
import { ListMemberEntity } from './list-member.entity';

@Injectable()
export class ListMemberRepositoryAdapter extends ListMemberRepositoryPort {
  constructor(
    @InjectRepository(ListMemberEntity)
    private readonly repo: Repository<ListMemberEntity>,
  ) {
    super();
  }

  async findByListId(listId: string): Promise<ListMember[]> {
    const entities = await this.repo.findBy({ listId });
    return entities.map((e) => e.toDomain());
  }

  async findByUserId(userId: string): Promise<ListMember[]> {
    const entities = await this.repo.findBy({ userId });
    return entities.map((e) => e.toDomain());
  }

  async findByListAndUser(listId: string, userId: string): Promise<ListMember | null> {
    const entity = await this.repo.findOneBy({ listId, userId });
    return entity?.toDomain() ?? null;
  }

  async save(member: ListMember): Promise<void> {
    await this.repo.save(ListMemberEntity.fromDomain(member));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByListId(listId: string): Promise<void> {
    await this.repo.delete({ listId });
  }
}
