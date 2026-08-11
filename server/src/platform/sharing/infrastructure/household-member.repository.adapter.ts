import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HouseholdMemberRepositoryPort } from '../domain/household-member.repository.port';
import { HouseholdMember } from '../domain/household-member.model';
import { HouseholdMemberEntity } from './household-member.entity';

@Injectable()
export class HouseholdMemberRepositoryAdapter extends HouseholdMemberRepositoryPort {
  constructor(
    @InjectRepository(HouseholdMemberEntity)
    private readonly repo: Repository<HouseholdMemberEntity>,
  ) {
    super();
  }

  async findByHouseholdId(householdId: string): Promise<HouseholdMember[]> {
    const entities = await this.repo.findBy({ householdId });
    return entities.map((e) => e.toDomain());
  }

  async findByUserId(userId: string): Promise<HouseholdMember[]> {
    const entities = await this.repo.findBy({ userId });
    return entities.map((e) => e.toDomain());
  }

  async findByHouseholdAndUser(householdId: string, userId: string): Promise<HouseholdMember | null> {
    const entity = await this.repo.findOneBy({ householdId, userId });
    return entity?.toDomain() ?? null;
  }

  async save(member: HouseholdMember): Promise<void> {
    await this.repo.save(HouseholdMemberEntity.fromDomain(member));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByHouseholdId(householdId: string): Promise<void> {
    await this.repo.delete({ householdId });
  }
}
