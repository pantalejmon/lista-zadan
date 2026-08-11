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

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ email });
    return entity?.toDomain() ?? null;
  }

  async save(user: User): Promise<void> {
    await this.repo.save(UserEntity.fromDomain(user));
  }

  async addStorageUsed(userId: string, deltaBytes: number): Promise<void> {
    await this.repo.query(
      `UPDATE "user" SET "usedStorageBytes" = MAX(0, "usedStorageBytes" + ?) WHERE "id" = ?`,
      [deltaBytes, userId],
    );
  }

  async updateSettings(userId: string, settingsJson: string): Promise<void> {
    // Targeted update so it never races with the storage-quota counter.
    await this.repo.update({ id: userId }, { settings: settingsJson });
  }
}
