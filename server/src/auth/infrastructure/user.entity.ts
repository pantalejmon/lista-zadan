import { Entity, Column, PrimaryColumn } from 'typeorm';
import { User } from '../domain/user.model';

@Entity('user')
export class UserEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar', { unique: true })
  googleId!: string;

  @Column('varchar')
  email!: string;

  @Column('varchar')
  displayName!: string;

  @Column('varchar', { nullable: true })
  avatarUrl!: string | null;

  @Column('bigint')
  createdAt!: number;

  @Column('bigint', { default: 0 })
  usedStorageBytes!: number;

  @Column('varchar', { nullable: true })
  settings!: string | null;

  toDomain(): User {
    return new User(
      this.id,
      this.googleId,
      this.email,
      this.displayName,
      this.avatarUrl,
      Number(this.createdAt),
      Number(this.usedStorageBytes),
      this.settings ?? null,
    );
  }

  static fromDomain(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.googleId = user.googleId;
    entity.email = user.email;
    entity.displayName = user.displayName;
    entity.avatarUrl = user.avatarUrl;
    entity.createdAt = user.createdAt;
    entity.usedStorageBytes = user.usedStorageBytes;
    entity.settings = user.settings;
    return entity;
  }
}
