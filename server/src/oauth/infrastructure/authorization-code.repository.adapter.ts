import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationCodeRepositoryPort } from '../domain/authorization-code.repository.port';
import { AuthorizationCode } from '../domain/authorization-code.model';
import { AuthorizationCodeEntity } from './authorization-code.entity';

@Injectable()
export class AuthorizationCodeRepositoryAdapter extends AuthorizationCodeRepositoryPort {
  constructor(
    @InjectRepository(AuthorizationCodeEntity)
    private readonly repo: Repository<AuthorizationCodeEntity>,
  ) {
    super();
  }

  async save(code: AuthorizationCode): Promise<void> {
    await this.repo.save(AuthorizationCodeEntity.fromDomain(code));
  }

  async findByHash(codeHash: string): Promise<AuthorizationCode | null> {
    const entity = await this.repo.findOne({ where: { codeHash } });
    return entity ? entity.toDomain() : null;
  }
}
