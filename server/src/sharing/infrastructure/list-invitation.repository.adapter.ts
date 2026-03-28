import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListInvitationRepositoryPort } from '../domain/list-invitation.repository.port';
import { ListInvitation } from '../domain/list-invitation.model';
import { ListInvitationEntity } from './list-invitation.entity';

@Injectable()
export class ListInvitationRepositoryAdapter extends ListInvitationRepositoryPort {
  constructor(
    @InjectRepository(ListInvitationEntity)
    private readonly repo: Repository<ListInvitationEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<ListInvitation | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity?.toDomain() ?? null;
  }

  async findByListId(listId: string): Promise<ListInvitation[]> {
    const entities = await this.repo.findBy({ listId });
    return entities.map((e) => e.toDomain());
  }

  async findPendingByEmail(email: string): Promise<ListInvitation[]> {
    const entities = await this.repo.findBy({ invitedEmail: email, status: 'pending' });
    return entities.map((e) => e.toDomain());
  }

  async save(invitation: ListInvitation): Promise<void> {
    await this.repo.save(ListInvitationEntity.fromDomain(invitation));
  }

  async update(invitation: ListInvitation): Promise<void> {
    await this.repo.save(ListInvitationEntity.fromDomain(invitation));
  }

  async deleteByListId(listId: string): Promise<void> {
    await this.repo.delete({ listId });
  }
}
