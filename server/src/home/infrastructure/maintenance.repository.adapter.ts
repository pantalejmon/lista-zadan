import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRepositoryPort } from '../domain/maintenance.repository.port';
import { Maintenance } from '../domain/maintenance.model';
import { MaintenanceEntity } from './maintenance.entity';

@Injectable()
export class MaintenanceRepositoryAdapter extends MaintenanceRepositoryPort {
  constructor(
    @InjectRepository(MaintenanceEntity)
    private readonly repo: Repository<MaintenanceEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Maintenance[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findByAsset(assetId: string): Promise<Maintenance[]> {
    const entities = await this.repo.find({ where: { assetId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Maintenance | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(maintenance: Maintenance): Promise<void> {
    await this.repo.save(MaintenanceEntity.fromDomain(maintenance));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByAsset(assetId: string): Promise<void> {
    await this.repo.delete({ assetId });
  }
}
