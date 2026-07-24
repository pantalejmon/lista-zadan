import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SharingModule } from '../sharing/sharing.module';
import { SharingService } from '../sharing/domain/sharing.service';
import { HomeAssetEntity } from './infrastructure/home-asset.entity';
import { MaintenanceEntity } from './infrastructure/maintenance.entity';
import { HomeAssetRepositoryPort } from './domain/home-asset.repository.port';
import { HomeAssetRepositoryAdapter } from './infrastructure/home-asset.repository.adapter';
import { MaintenanceRepositoryPort } from './domain/maintenance.repository.port';
import { MaintenanceRepositoryAdapter } from './infrastructure/maintenance.repository.adapter';
import { HomeService } from './domain/home.service';
import { HomeController } from './web/home.controller';
import { HomeGateway } from './web/home.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([HomeAssetEntity, MaintenanceEntity]),
    AuthModule,
    SharingModule,
  ],
  controllers: [HomeController],
  providers: [
    { provide: HomeAssetRepositoryPort, useClass: HomeAssetRepositoryAdapter },
    { provide: MaintenanceRepositoryPort, useClass: MaintenanceRepositoryAdapter },
    HomeGateway,
    {
      provide: HomeService,
      useFactory: (
        assetRepo: HomeAssetRepositoryPort,
        maintenanceRepo: MaintenanceRepositoryPort,
        sharingService: SharingService,
        gateway: HomeGateway,
      ) => new HomeService(assetRepo, maintenanceRepo, sharingService, gateway),
      inject: [HomeAssetRepositoryPort, MaintenanceRepositoryPort, SharingService, HomeGateway],
    },
  ],
  exports: [HomeService],
})
export class HomeModule {}
