import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { PushSubscription } from '../domain/push-subscription.model';

@Entity('push_subscription')
export class PushSubscriptionEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  userId!: string;

  @Index({ unique: true })
  @Column('varchar')
  endpoint!: string;

  @Column('varchar')
  p256dh!: string;

  @Column('varchar')
  auth!: string;

  @Column('varchar', { nullable: true })
  userAgent!: string | null;

  @Column('bigint')
  createdAt!: number;

  toDomain(): PushSubscription {
    return new PushSubscription(
      this.id,
      this.userId,
      this.endpoint,
      this.p256dh,
      this.auth,
      this.userAgent,
      Number(this.createdAt),
    );
  }

  static fromDomain(sub: PushSubscription): PushSubscriptionEntity {
    const entity = new PushSubscriptionEntity();
    entity.id = sub.id;
    entity.userId = sub.userId;
    entity.endpoint = sub.endpoint;
    entity.p256dh = sub.p256dh;
    entity.auth = sub.auth;
    entity.userAgent = sub.userAgent;
    entity.createdAt = sub.createdAt;
    return entity;
  }
}
