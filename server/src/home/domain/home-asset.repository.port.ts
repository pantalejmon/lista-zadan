import { HomeAsset } from './home-asset.model';

export abstract class HomeAssetRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<HomeAsset[]>;
  abstract findById(id: string): Promise<HomeAsset | null>;
  abstract save(asset: HomeAsset): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
