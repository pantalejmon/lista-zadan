import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { ListRole } from '../../sharing/domain/list-role';
import { SharingService } from '../../sharing/domain/sharing.service';
import { HomeAsset, type HomeAssetResponse } from './home-asset.model';
import { Maintenance, type MaintenanceResponse } from './maintenance.model';
import { Provider, type ProviderResponse } from './provider.model';
import { Renovation, type RenovationResponse } from './renovation.model';
import { HomeAssetRepositoryPort } from './home-asset.repository.port';
import { MaintenanceRepositoryPort } from './maintenance.repository.port';
import { ProviderRepositoryPort } from './provider.repository.port';
import { RenovationRepositoryPort } from './renovation.repository.port';
import { HomeGateway } from '../web/home.gateway';
import { CreateAssetDto } from '../web/dto/create-asset.dto';
import { CreateMaintenanceDto } from '../web/dto/create-maintenance.dto';
import { CompleteMaintenanceDto } from '../web/dto/complete-maintenance.dto';
import { CreateProviderDto } from '../web/dto/create-provider.dto';
import { CreateRenovationDto } from '../web/dto/create-renovation.dto';

const WRITE_ROLES: ListRole[] = ['owner', 'editor'];
const READ_ROLES: ListRole[] = ['owner', 'editor', 'viewer'];

// How many days ahead a due date counts as "coming up soon".
const SOON_DAYS = 30;

export interface HomeAssetWithMaintenance extends HomeAssetResponse {
  maintenance: MaintenanceResponse[];
}

export class HomeService {
  constructor(
    private readonly assetRepo: HomeAssetRepositoryPort,
    private readonly maintenanceRepo: MaintenanceRepositoryPort,
    private readonly providerRepo: ProviderRepositoryPort,
    private readonly renovationRepo: RenovationRepositoryPort,
    private readonly sharingService: SharingService,
    private readonly gateway: HomeGateway,
  ) {}

  // ---- assets ----

  async getAssets(householdId: string, userId: string): Promise<HomeAssetWithMaintenance[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const [assets, maintenance, providers] = await Promise.all([
      this.assetRepo.findByHousehold(householdId),
      this.maintenanceRepo.findByHousehold(householdId),
      this.providerRepo.findByHousehold(householdId),
    ]);
    const today = this.today();
    const providerNames = new Map(providers.map((p) => [p.id, p.name]));
    const byAsset = new Map<string, MaintenanceResponse[]>();
    for (const m of maintenance) {
      const list = byAsset.get(m.assetId) ?? [];
      list.push(m.toResponse(today, SOON_DAYS, m.providerId ? providerNames.get(m.providerId) ?? null : null));
      byAsset.set(m.assetId, list);
    }
    return assets
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
      .map((asset) => ({
        ...asset.toResponse(),
        maintenance: (byAsset.get(asset.id) ?? []).sort(byDueDate),
      }));
  }

  async createAsset(householdId: string, userId: string, dto: CreateAssetDto): Promise<HomeAssetResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const asset = HomeAsset.createFromDto(dto, householdId);
    await this.assetRepo.save(asset);
    this.gateway.notifyChanged(householdId);
    return asset.toResponse();
  }

  async updateAsset(id: string, userId: string, dto: CreateAssetDto): Promise<HomeAssetResponse> {
    const asset = await this.findAssetOrThrow(id);
    await this.sharingService.assertHouseholdPermission(asset.householdId, userId, WRITE_ROLES);
    const updated = asset.update(dto);
    await this.assetRepo.save(updated);
    this.gateway.notifyChanged(asset.householdId);
    return updated.toResponse();
  }

  async deleteAsset(id: string, userId: string): Promise<void> {
    const asset = await this.findAssetOrThrow(id);
    await this.sharingService.assertHouseholdPermission(asset.householdId, userId, WRITE_ROLES);
    // Removing an asset removes its maintenance schedule too.
    await this.maintenanceRepo.deleteByAsset(id);
    await this.assetRepo.delete(id);
    this.gateway.notifyChanged(asset.householdId);
  }

  // ---- maintenance ----

  async createMaintenance(
    householdId: string,
    userId: string,
    dto: CreateMaintenanceDto,
  ): Promise<MaintenanceResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const asset = await this.findAssetOrThrow(dto.assetId);
    if (asset.householdId !== householdId) {
      throw new BadRequestException('Asset does not belong to this household');
    }
    await this.assertProviderInHousehold(dto.providerId, householdId);
    const maintenance = Maintenance.createFromDto(dto, householdId);
    await this.maintenanceRepo.save(maintenance);
    this.gateway.notifyChanged(householdId);
    return maintenance.toResponse(this.today(), SOON_DAYS, await this.providerNameFor(maintenance.providerId));
  }

  async updateMaintenance(id: string, userId: string, dto: CreateMaintenanceDto): Promise<MaintenanceResponse> {
    const maintenance = await this.findMaintenanceOrThrow(id);
    await this.sharingService.assertHouseholdPermission(maintenance.householdId, userId, WRITE_ROLES);
    if (dto.assetId !== maintenance.assetId) {
      const asset = await this.findAssetOrThrow(dto.assetId);
      if (asset.householdId !== maintenance.householdId) {
        throw new BadRequestException('Asset does not belong to this household');
      }
    }
    await this.assertProviderInHousehold(dto.providerId, maintenance.householdId);
    const updated = maintenance.update(dto);
    await this.maintenanceRepo.save(updated);
    this.gateway.notifyChanged(maintenance.householdId);
    return updated.toResponse(this.today(), SOON_DAYS, await this.providerNameFor(updated.providerId));
  }

  // Loop closer: mark a maintenance as done → record the date, roll the next due
  // date forward by the interval, optionally log the cost.
  async completeMaintenance(id: string, userId: string, dto: CompleteMaintenanceDto): Promise<MaintenanceResponse> {
    const maintenance = await this.findMaintenanceOrThrow(id);
    await this.sharingService.assertHouseholdPermission(maintenance.householdId, userId, WRITE_ROLES);
    const doneAt = dto.doneAt?.trim() || this.today();
    const cost = typeof dto.cost === 'number' && dto.cost >= 0 ? dto.cost : null;
    const updated = maintenance.withCompleted(doneAt, cost);
    await this.maintenanceRepo.save(updated);
    this.gateway.notifyChanged(maintenance.householdId);
    return updated.toResponse(this.today(), SOON_DAYS, await this.providerNameFor(updated.providerId));
  }

  async deleteMaintenance(id: string, userId: string): Promise<void> {
    const maintenance = await this.findMaintenanceOrThrow(id);
    await this.sharingService.assertHouseholdPermission(maintenance.householdId, userId, WRITE_ROLES);
    await this.maintenanceRepo.delete(id);
    this.gateway.notifyChanged(maintenance.householdId);
  }

  // ---- providers (wykonawcy) ----

  async getProviders(householdId: string, userId: string): Promise<ProviderResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const providers = await this.providerRepo.findByHousehold(householdId);
    return providers.sort((a, b) => a.name.localeCompare(b.name, 'pl')).map((p) => p.toResponse());
  }

  async createProvider(householdId: string, userId: string, dto: CreateProviderDto): Promise<ProviderResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const provider = Provider.createFromDto(dto, householdId);
    await this.providerRepo.save(provider);
    this.gateway.notifyChanged(householdId);
    return provider.toResponse();
  }

  async updateProvider(id: string, userId: string, dto: CreateProviderDto): Promise<ProviderResponse> {
    const provider = await this.findProviderOrThrow(id);
    await this.sharingService.assertHouseholdPermission(provider.householdId, userId, WRITE_ROLES);
    const updated = provider.update(dto);
    await this.providerRepo.save(updated);
    this.gateway.notifyChanged(provider.householdId);
    return updated.toResponse();
  }

  async deleteProvider(id: string, userId: string): Promise<void> {
    const provider = await this.findProviderOrThrow(id);
    await this.sharingService.assertHouseholdPermission(provider.householdId, userId, WRITE_ROLES);
    await this.providerRepo.delete(id);
    // Dangling providerId on maintenance resolves to a null provider name — harmless.
    this.gateway.notifyChanged(provider.householdId);
  }

  // ---- renovations (remonty) ----

  async getRenovations(householdId: string, userId: string): Promise<RenovationResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const renovations = await this.renovationRepo.findByHousehold(householdId);
    return renovations.sort((a, b) => b.createdAt - a.createdAt).map((r) => r.toResponse());
  }

  async createRenovation(householdId: string, userId: string, dto: CreateRenovationDto): Promise<RenovationResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const renovation = Renovation.createFromDto(dto, householdId);
    await this.renovationRepo.save(renovation);
    this.gateway.notifyChanged(householdId);
    return renovation.toResponse();
  }

  async updateRenovation(id: string, userId: string, dto: CreateRenovationDto): Promise<RenovationResponse> {
    const renovation = await this.findRenovationOrThrow(id);
    await this.sharingService.assertHouseholdPermission(renovation.householdId, userId, WRITE_ROLES);
    const updated = renovation.update(dto);
    await this.renovationRepo.save(updated);
    this.gateway.notifyChanged(renovation.householdId);
    return updated.toResponse();
  }

  async deleteRenovation(id: string, userId: string): Promise<void> {
    const renovation = await this.findRenovationOrThrow(id);
    await this.sharingService.assertHouseholdPermission(renovation.householdId, userId, WRITE_ROLES);
    await this.renovationRepo.delete(id);
    this.gateway.notifyChanged(renovation.householdId);
  }

  // ---- internals ----

  private async assertProviderInHousehold(providerId: string | undefined, householdId: string): Promise<void> {
    if (!providerId) {
      return;
    }
    const provider = await this.providerRepo.findById(providerId);
    if (!provider || provider.householdId !== householdId) {
      throw new BadRequestException('Provider does not belong to this household');
    }
  }

  private async providerNameFor(providerId: string | null): Promise<string | null> {
    if (!providerId) {
      return null;
    }
    const provider = await this.providerRepo.findById(providerId);
    return provider ? provider.name : null;
  }

  private async findProviderOrThrow(id: string): Promise<Provider> {
    const provider = await this.providerRepo.findById(id);
    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }
    return provider;
  }

  private async findRenovationOrThrow(id: string): Promise<Renovation> {
    const renovation = await this.renovationRepo.findById(id);
    if (!renovation) {
      throw new NotFoundException(`Renovation ${id} not found`);
    }
    return renovation;
  }

  private async findAssetOrThrow(id: string): Promise<HomeAsset> {
    const asset = await this.assetRepo.findById(id);
    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    return asset;
  }

  private async findMaintenanceOrThrow(id: string): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepo.findById(id);
    if (!maintenance) {
      throw new NotFoundException(`Maintenance ${id} not found`);
    }
    return maintenance;
  }

  private today(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
  }
}

// Soonest due first; entries without a due date sink to the bottom.
function byDueDate(a: MaintenanceResponse, b: MaintenanceResponse): number {
  if (a.nextDueAt && b.nextDueAt) {
    return a.nextDueAt.localeCompare(b.nextDueAt);
  }
  if (a.nextDueAt) {
    return -1;
  }
  if (b.nextDueAt) {
    return 1;
  }
  return a.type.localeCompare(b.type, 'pl');
}
