import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HouseholdInvitationRepositoryPort } from '../domain/household-invitation.repository.port';
import { HouseholdInvitation } from '../domain/household-invitation.model';
import { HouseholdInvitationEntity } from './household-invitation.entity';

@Injectable()
export class HouseholdInvitationRepositoryAdapter extends HouseholdInvitationRepositoryPort {
  constructor(
    @InjectRepository(HouseholdInvitationEntity)
    private readonly repo: Repository<HouseholdInvitationEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<HouseholdInvitation | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity?.toDomain() ?? null;
  }

  async findPendingByEmail(email: string): Promise<HouseholdInvitation[]> {
    const entities = await this.repo.findBy({ invitedEmail: email, status: 'pending' });
    return entities.map((e) => e.toDomain());
  }

  async save(invitation: HouseholdInvitation): Promise<void> {
    await this.repo.save(HouseholdInvitationEntity.fromDomain(invitation));
  }

  async update(invitation: HouseholdInvitation): Promise<void> {
    await this.repo.save(HouseholdInvitationEntity.fromDomain(invitation));
  }

  async deleteByHouseholdId(householdId: string): Promise<void> {
    await this.repo.delete({ householdId });
  }
}
