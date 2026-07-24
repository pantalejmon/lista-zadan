import { randomUUID } from 'crypto';

export class PushSubscription {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly endpoint: string,
    readonly p256dh: string,
    readonly auth: string,
    readonly userAgent: string | null,
    readonly createdAt: number,
  ) {}

  static create(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent: string | null,
    existingId?: string,
  ): PushSubscription {
    return new PushSubscription(
      existingId ?? randomUUID(),
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent,
      Date.now(),
    );
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}
