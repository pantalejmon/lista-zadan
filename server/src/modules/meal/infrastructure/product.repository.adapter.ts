import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepositoryPort } from '../domain/product.repository.port';
import { Product } from '../domain/product.model';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductRepositoryAdapter extends ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Product[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(product: Product): Promise<void> {
    await this.repo.save(ProductEntity.fromDomain(product));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
