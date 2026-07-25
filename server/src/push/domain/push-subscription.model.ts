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

// A notification action button. On Android Chrome an action with `type: 'text'`
// renders an inline reply field; iOS ignores actions entirely (falls back to a
// plain tap that deep-links via `url`).
export interface PushNotificationAction {
  action: string;
  title: string;
  type?: 'button' | 'text';
  placeholder?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  // Where a tap should land. Use an in-app hash like '/#chat' so the SPA can
  // route to the right section instead of always booting on the task list.
  url?: string;
  tag?: string;
  // Structured target for the service worker: e.g. { type: 'chat', householdId }.
  // Drives deep-linking and gives inline-reply the context it needs to post back.
  data?: Record<string, unknown>;
  actions?: PushNotificationAction[];
}
