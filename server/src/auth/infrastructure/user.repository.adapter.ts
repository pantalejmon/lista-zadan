import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.model';
import { UserRepositoryPort } from '../domain/user.repository.port';
import { UserEntity } from './user.entity';

@Injectable()
export class UserRepositoryAdapter extends UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity?.toDomain() ?? null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ googleId });
    return entity?.toDomain() ?? null;
  }

  async save(user: User): Promise<void> {
    await this.repo.save(UserEntity.fromDomain(user));
  }
}
