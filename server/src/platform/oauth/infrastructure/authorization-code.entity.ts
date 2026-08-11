import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { AuthorizationCode } from '../domain/authorization-code.model';
import { ApiScope } from '@platform/api-token/domain/api-scope';

@Entity('oauth_auth_code')
export class AuthorizationCodeEntity {
  @PrimaryColumn('varchar')
  codeHash!: string;

  @Index()
  @Column('varchar')
  clientId!: string;

  @Column('varchar')
  userId!: string;

  @Column('varchar')
  redirectUri!: string;

  @Column('varchar')
  codeChallenge!: string;

  // Comma-separated scope list.
  @Column('varchar')
  scopes!: string;

  @Column('varchar', { nullable: true })
  resource!: string | null;

  @Column('bigint')
  expiresAt!: number;

  @Column('bigint', { nullable: true })
  consumedAt!: number | null;

  toDomain(): AuthorizationCode {
    return new AuthorizationCode(
      this.codeHash,
      this.clientId,
      this.userId,
      this.redirectUri,
      this.codeChallenge,
      this.scopes ? (this.scopes.split(',') as ApiScope[]) : [],
      this.resource,
      Number(this.expiresAt),
      this.consumedAt === null ? null : Number(this.consumedAt),
    );
  }

  static fromDomain(code: AuthorizationCode): AuthorizationCodeEntity {
    const entity = new AuthorizationCodeEntity();
    entity.codeHash = code.codeHash;
    entity.clientId = code.clientId;
    entity.userId = code.userId;
    entity.redirectUri = code.redirectUri;
    entity.codeChallenge = code.codeChallenge;
    entity.scopes = code.scopes.join(',');
    entity.resource = code.resource;
    entity.expiresAt = code.expiresAt;
    entity.consumedAt = code.consumedAt;
    return entity;
  }
}
