import { Entity, Column, PrimaryColumn } from 'typeorm';
import { OAuthClient } from '../domain/oauth-client.model';

@Entity('oauth_client')
export class OAuthClientEntity {
  @PrimaryColumn('varchar')
  clientId!: string;

  @Column('varchar')
  clientName!: string;

  // JSON-encoded array of allowed redirect URIs.
  @Column('varchar')
  redirectUris!: string;

  @Column('bigint')
  createdAt!: number;

  toDomain(): OAuthClient {
    return new OAuthClient(
      this.clientId,
      this.clientName,
      JSON.parse(this.redirectUris) as string[],
      Number(this.createdAt),
    );
  }

  static fromDomain(client: OAuthClient): OAuthClientEntity {
    const entity = new OAuthClientEntity();
    entity.clientId = client.clientId;
    entity.clientName = client.clientName;
    entity.redirectUris = JSON.stringify(client.redirectUris);
    entity.createdAt = client.createdAt;
    return entity;
  }
}
