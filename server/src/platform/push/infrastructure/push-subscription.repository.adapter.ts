import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushSubscriptionRepositoryPort } from '../domain/push-subscription.repository.port';
import { PushSubscription } from '../domain/push-subscription.model';
import { PushSubscriptionEntity } from './push-subscription.entity';

@Injectable()
export class PushSubscriptionRepositoryAdapter extends PushSubscriptionRepositoryPort {
  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repo: Repository<PushSubscriptionEntity>,
  ) {
    super();
  }

  async findByUsers(userIds: string[]): Promise<PushSubscription[]> {
    if (userIds.length === 0) {
      return [];
    }
    const entities = await this.repo.find({ where: { userId: In(userIds) } });
    return entities.map((e) => e.toDomain());
  }

  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    const entity = await this.repo.findOne({ where: { endpoint } });
    return entity ? entity.toDomain() : null;
  }

  async save(subscription: PushSubscription): Promise<void> {
    await this.repo.save(PushSubscriptionEntity.fromDomain(subscription));
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.repo.delete({ endpoint });
  }
}
