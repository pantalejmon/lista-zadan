import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from './infrastructure/user.entity';
import { UserRepositoryPort } from './domain/user.repository.port';
import { UserRepositoryAdapter } from './infrastructure/user.repository.adapter';
import { AuthService } from './domain/auth.service';
import { GoogleStrategy } from './web/google.strategy';
import { JwtStrategy } from './web/jwt.strategy';
import { JwtAuthGuard } from './web/jwt-auth.guard';
import { AuthController } from './web/auth.controller';

import { McpRegistryModule } from '@platform/mcp/mcp-registry.module';
import { McpToolRegistry } from '@platform/mcp/domain/mcp-tool.registry';
import { buildSettingsTools } from './mcp/settings.tools';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    McpRegistryModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn', '7d') as `${number}d` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: UserRepositoryPort,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: AuthService,
      useFactory: (repo: UserRepositoryPort, jwt: JwtService) =>
        new AuthService(repo, jwt),
      inject: [UserRepositoryPort, JwtService],
    },
    GoogleStrategy,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule, UserRepositoryPort],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private readonly registry: McpToolRegistry,
    private readonly authService: AuthService,
  ) {}

  // Moduł sam wnosi swoje narzędzia MCP — sterowanie agentem to kolejne
  // wejście do tej samej logiki, obok kontrolera REST i gatewaya.
  onModuleInit(): void {
    this.registry.register(buildSettingsTools(this.authService));
  }
}
