import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RenovationRepositoryPort } from '../domain/renovation.repository.port';
import { Renovation } from '../domain/renovation.model';
import { RenovationEntity } from './renovation.entity';

@Injectable()
export class RenovationRepositoryAdapter extends RenovationRepositoryPort {
  constructor(
    @InjectRepository(RenovationEntity)
    private readonly repo: Repository<RenovationEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Renovation[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Renovation | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(renovation: Renovation): Promise<void> {
    await this.repo.save(RenovationEntity.fromDomain(renovation));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
