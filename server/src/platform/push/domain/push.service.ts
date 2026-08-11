import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscription, type PushPayload } from './push-subscription.model';
import { PushSubscriptionRepositoryPort } from './push-subscription.repository.port';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;
  private readonly publicKey: string;

  constructor(
    private readonly repo: PushSubscriptionRepositoryPort,
    config: ConfigService,
  ) {
    this.publicKey = config.get<string>('vapid.publicKey') ?? '';
    const privateKey = config.get<string>('vapid.privateKey') ?? '';
    const subject = config.get<string>('vapid.subject') ?? 'mailto:admin@example.com';
    this.enabled = Boolean(this.publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(subject, this.publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys not configured — push notifications are disabled.');
    }
  }

  getPublicKey(): string {
    return this.enabled ? this.publicKey : '';
  }

  async subscribe(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent: string | null,
  ): Promise<void> {
    const existing = await this.repo.findByEndpoint(endpoint);
    const subscription = PushSubscription.create(userId, endpoint, p256dh, auth, userAgent, existing?.id);
    await this.repo.save(subscription);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.repo.deleteByEndpoint(endpoint);
  }

  sendToUser(userId: string, payload: PushPayload): Promise<void> {
    return this.sendToUsers([userId], payload);
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.enabled || userIds.length === 0) {
      return;
    }
    const subscriptions = await this.repo.findByUsers(userIds);
    const body = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          )
          .catch((err: unknown) => this.handleSendError(err, sub.endpoint)),
      ),
    );
  }

  private async handleSendError(err: unknown, endpoint: string): Promise<void> {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription expired / unsubscribed — clean it up.
      await this.repo.deleteByEndpoint(endpoint);
      return;
    }
    this.logger.warn(`Push send failed (${statusCode ?? 'unknown'})`);
  }
}
