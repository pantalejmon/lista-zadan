import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeAssetRepositoryPort } from '../domain/home-asset.repository.port';
import { HomeAsset } from '../domain/home-asset.model';
import { HomeAssetEntity } from './home-asset.entity';

@Injectable()
export class HomeAssetRepositoryAdapter extends HomeAssetRepositoryPort {
  constructor(
    @InjectRepository(HomeAssetEntity)
    private readonly repo: Repository<HomeAssetEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<HomeAsset[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<HomeAsset | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(asset: HomeAsset): Promise<void> {
    await this.repo.save(HomeAssetEntity.fromDomain(asset));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
