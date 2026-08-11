import { PushSubscription } from './push-subscription.model';

export abstract class PushSubscriptionRepositoryPort {
  abstract findByUsers(userIds: string[]): Promise<PushSubscription[]>;
  abstract findByEndpoint(endpoint: string): Promise<PushSubscription | null>;
  abstract save(subscription: PushSubscription): Promise<void>;
  abstract deleteByEndpoint(endpoint: string): Promise<void>;
}
