const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function getPublicKey(): Promise<string> {
  const res = await fetch(`${API_URL}/push/vapid-public-key`, { credentials: 'include' });
  if (!res.ok) {
    return '';
  }
  const data = (await res.json()) as { publicKey: string };
  return data.publicKey;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// Returns false if push is unavailable (no VAPID key configured) or permission denied.
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }
  const publicKey = await getPublicKey();
  if (!publicKey) {
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return false;
  }
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  const json = subscription.toJSON();
  const res = await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return res.ok;
}

export async function disablePush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    return;
  }
  await fetch(`${API_URL}/push/unsubscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

export async function isPushAvailable(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }
  return Boolean(await getPublicKey());
}
