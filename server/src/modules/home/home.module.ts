import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@platform/auth/auth.module';
import { SharingModule } from '@platform/sharing/sharing.module';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { HomeAssetEntity } from './infrastructure/home-asset.entity';
import { MaintenanceEntity } from './infrastructure/maintenance.entity';
import { ProviderEntity } from './infrastructure/provider.entity';
import { RenovationEntity } from './infrastructure/renovation.entity';
import { HomeAssetRepositoryPort } from './domain/home-asset.repository.port';
import { HomeAssetRepositoryAdapter } from './infrastructure/home-asset.repository.adapter';
import { MaintenanceRepositoryPort } from './domain/maintenance.repository.port';
import { MaintenanceRepositoryAdapter } from './infrastructure/maintenance.repository.adapter';
import { ProviderRepositoryPort } from './domain/provider.repository.port';
import { ProviderRepositoryAdapter } from './infrastructure/provider.repository.adapter';
import { RenovationRepositoryPort } from './domain/renovation.repository.port';
import { RenovationRepositoryAdapter } from './infrastructure/renovation.repository.adapter';
import { HomeService } from './domain/home.service';
import { HomeController } from './web/home.controller';
import { HomeGateway } from './web/home.gateway';

import { McpRegistryModule } from '@platform/mcp/mcp-registry.module';
import { McpToolRegistry } from '@platform/mcp/domain/mcp-tool.registry';
import { buildHomeTools } from './mcp/home.tools';

@Module({
  imports: [
    TypeOrmModule.forFeature([HomeAssetEntity, MaintenanceEntity, ProviderEntity, RenovationEntity]),
    AuthModule,
    SharingModule,
    McpRegistryModule,
  ],
  controllers: [HomeController],
  providers: [
    { provide: HomeAssetRepositoryPort, useClass: HomeAssetRepositoryAdapter },
    { provide: MaintenanceRepositoryPort, useClass: MaintenanceRepositoryAdapter },
    { provide: ProviderRepositoryPort, useClass: ProviderRepositoryAdapter },
    { provide: RenovationRepositoryPort, useClass: RenovationRepositoryAdapter },
    HomeGateway,
    {
      provide: HomeService,
      useFactory: (
        assetRepo: HomeAssetRepositoryPort,
        maintenanceRepo: MaintenanceRepositoryPort,
        providerRepo: ProviderRepositoryPort,
        renovationRepo: RenovationRepositoryPort,
        sharingService: SharingService,
        gateway: HomeGateway,
      ) => new HomeService(assetRepo, maintenanceRepo, providerRepo, renovationRepo, sharingService, gateway),
      inject: [
        HomeAssetRepositoryPort,
        MaintenanceRepositoryPort,
        ProviderRepositoryPort,
        RenovationRepositoryPort,
        SharingService,
        HomeGateway,
      ],
    },
  ],
  exports: [HomeService],
})
export class HomeModule implements OnModuleInit {
  constructor(
    private readonly registry: McpToolRegistry,
    private readonly homeService: HomeService,
  ) {}

  // Moduł sam wnosi swoje narzędzia MCP — sterowanie agentem to kolejne
  // wejście do tej samej logiki, obok kontrolera REST i gatewaya.
  onModuleInit(): void {
    this.registry.register(buildHomeTools(this.homeService));
  }
}
