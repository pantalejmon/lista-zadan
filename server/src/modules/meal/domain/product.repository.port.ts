import { Product } from './product.model';

export abstract class ProductRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Product[]>;
  abstract findById(id: string): Promise<Product | null>;
  abstract save(product: Product): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
