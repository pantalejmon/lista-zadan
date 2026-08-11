import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { ApiToken } from '../domain/api-token.model';
import { ApiScope } from '../domain/api-scope';

@Entity('api_token')
export class ApiTokenEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  userId!: string;

  @Column('varchar')
  name!: string;

  @Index({ unique: true })
  @Column('varchar')
  tokenHash!: string;

  // Comma-separated scope list (e.g. "todo:read,meals:write").
  @Column('varchar')
  scopes!: string;

  @Column('varchar', { nullable: true })
  householdId!: string | null;

  @Column('bigint')
  createdAt!: number;

  @Column('bigint', { nullable: true })
  expiresAt!: number | null;

  @Column('bigint', { nullable: true })
  lastUsedAt!: number | null;

  @Column('bigint', { nullable: true })
  revokedAt!: number | null;

  toDomain(): ApiToken {
    return new ApiToken(
      this.id,
      this.userId,
      this.name,
      this.tokenHash,
      this.scopes ? (this.scopes.split(',') as ApiScope[]) : [],
      this.householdId,
      Number(this.createdAt),
      this.expiresAt === null ? null : Number(this.expiresAt),
      this.lastUsedAt === null ? null : Number(this.lastUsedAt),
      this.revokedAt === null ? null : Number(this.revokedAt),
    );
  }

  static fromDomain(token: ApiToken): ApiTokenEntity {
    const entity = new ApiTokenEntity();
    entity.id = token.id;
    entity.userId = token.userId;
    entity.name = token.name;
    entity.tokenHash = token.tokenHash;
    entity.scopes = token.scopes.join(',');
    entity.householdId = token.householdId;
    entity.createdAt = token.createdAt;
    entity.expiresAt = token.expiresAt;
    entity.lastUsedAt = token.lastUsedAt;
    entity.revokedAt = token.revokedAt;
    return entity;
  }
}
