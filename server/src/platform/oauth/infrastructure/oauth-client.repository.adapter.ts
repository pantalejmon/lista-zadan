import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthClientRepositoryPort } from '../domain/oauth-client.repository.port';
import { OAuthClient } from '../domain/oauth-client.model';
import { OAuthClientEntity } from './oauth-client.entity';

@Injectable()
export class OAuthClientRepositoryAdapter extends OAuthClientRepositoryPort {
  constructor(
    @InjectRepository(OAuthClientEntity)
    private readonly repo: Repository<OAuthClientEntity>,
  ) {
    super();
  }

  async save(client: OAuthClient): Promise<void> {
    await this.repo.save(OAuthClientEntity.fromDomain(client));
  }

  async findById(clientId: string): Promise<OAuthClient | null> {
    const entity = await this.repo.findOne({ where: { clientId } });
    return entity ? entity.toDomain() : null;
  }
}
