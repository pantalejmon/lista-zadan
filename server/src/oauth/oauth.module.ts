import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ApiTokenModule } from '../api-token/api-token.module';
import { ApiTokenService } from '../api-token/domain/api-token.service';
import { OAuthClientEntity } from './infrastructure/oauth-client.entity';
import { AuthorizationCodeEntity } from './infrastructure/authorization-code.entity';
import { OAuthClientRepositoryPort } from './domain/oauth-client.repository.port';
import { OAuthClientRepositoryAdapter } from './infrastructure/oauth-client.repository.adapter';
import { AuthorizationCodeRepositoryPort } from './domain/authorization-code.repository.port';
import { AuthorizationCodeRepositoryAdapter } from './infrastructure/authorization-code.repository.adapter';
import { OAuthService } from './domain/oauth.service';
import { OAuthController } from './web/oauth.controller';
import { OAuthMetadataController } from './web/oauth-metadata.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthClientEntity, AuthorizationCodeEntity]),
    AuthModule,
    ApiTokenModule,
  ],
  controllers: [OAuthController, OAuthMetadataController],
  providers: [
    { provide: OAuthClientRepositoryPort, useClass: OAuthClientRepositoryAdapter },
    { provide: AuthorizationCodeRepositoryPort, useClass: AuthorizationCodeRepositoryAdapter },
    {
      provide: OAuthService,
      useFactory: (
        clients: OAuthClientRepositoryPort,
        codes: AuthorizationCodeRepositoryPort,
        apiTokens: ApiTokenService,
      ) => new OAuthService(clients, codes, apiTokens),
      inject: [OAuthClientRepositoryPort, AuthorizationCodeRepositoryPort, ApiTokenService],
    },
  ],
})
export class OAuthModule {}
