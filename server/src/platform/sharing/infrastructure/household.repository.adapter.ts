import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HouseholdRepositoryPort } from '../domain/household.repository.port';
import { Household } from '../domain/household.model';
import { HouseholdEntity } from './household.entity';

@Injectable()
export class HouseholdRepositoryAdapter extends HouseholdRepositoryPort {
  constructor(
    @InjectRepository(HouseholdEntity)
    private readonly repo: Repository<HouseholdEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<Household | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity?.toDomain() ?? null;
  }

  async findByIds(ids: string[]): Promise<Household[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.repo.findBy({ id: In(ids) });
    return entities.map((e) => e.toDomain());
  }

  async save(household: Household): Promise<void> {
    await this.repo.save(HouseholdEntity.fromDomain(household));
  }

  async update(household: Household): Promise<void> {
    await this.repo.save(HouseholdEntity.fromDomain(household));
  }
}
