import { Maintenance } from './maintenance.model';

export abstract class MaintenanceRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Maintenance[]>;
  abstract findByAsset(assetId: string): Promise<Maintenance[]>;
  abstract findById(id: string): Promise<Maintenance | null>;
  abstract save(maintenance: Maintenance): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByAsset(assetId: string): Promise<void>;
}
