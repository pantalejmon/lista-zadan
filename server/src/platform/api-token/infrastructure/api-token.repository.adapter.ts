import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTokenRepositoryPort } from '../domain/api-token.repository.port';
import { ApiToken } from '../domain/api-token.model';
import { ApiTokenEntity } from './api-token.entity';

@Injectable()
export class ApiTokenRepositoryAdapter extends ApiTokenRepositoryPort {
  constructor(
    @InjectRepository(ApiTokenEntity)
    private readonly repo: Repository<ApiTokenEntity>,
  ) {
    super();
  }

  async findByUser(userId: string): Promise<ApiToken[]> {
    const entities = await this.repo.find({ where: { userId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<ApiToken | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async findByHash(tokenHash: string): Promise<ApiToken | null> {
    const entity = await this.repo.findOne({ where: { tokenHash } });
    return entity ? entity.toDomain() : null;
  }

  async save(token: ApiToken): Promise<void> {
    await this.repo.save(ApiTokenEntity.fromDomain(token));
  }
}
