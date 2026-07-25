// Bumping the version deletes the previous cache on activate — which also purges
// any poisoned /api or /socket.io responses cached by older (v1) service workers.
const CACHE_NAME = 'lista-zadan-v2';

// Requests that must NEVER be cached or served from cache. The socket.io polling
// transport uses GET handshake/poll frames tied to a live session id; caching them
// makes the SW replay a stale `sid` on any network blip, so the websocket can never
// finish its handshake (permanent "offline" on flaky mobile networks). API GETs must
// stay fresh too — a cached copy would show stale data.
function isNetworkOnly(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/');
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never intercept API or socket.io traffic — let it hit the network directly so
  // the session stays live and data stays fresh.
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && isNetworkOnly(url)) {
    return;
  }

  // App shell / static assets: network-first, fall back to cache when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// --- Web Push ---
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Lista Zadań';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    // Keep the routing target (url) plus any structured context (type,
    // householdId, …) so notificationclick can deep-link and reply.
    data: { url: data.url || '/', ...(data.data || {}) },
    // Action buttons / inline reply — Android renders them, iOS ignores them.
    actions: Array.isArray(data.actions) ? data.actions : undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  notification.close();

  // Inline reply from the notification (Android): post the typed text straight
  // to the chat endpoint without opening the app.
  if (event.action === 'reply') {
    const text = (event.reply || '').trim();
    if (text && data.type === 'chat' && data.householdId) {
      event.waitUntil(sendChatReply(data.householdId, text));
    }
    return;
  }

  event.waitUntil(openApp(data.url || '/', data));
});

// Post a chat reply on the user's behalf. The session cookie rides along via
// credentials:'include' (the SW is same-origin), so the JWT guard accepts it.
async function sendChatReply(householdId, text) {
  try {
    const res = await fetch(`/api/households/${householdId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`reply failed: ${res.status}`);
    }
    // Nudge any open window to refresh the thread it may be showing.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'chat-reply-sent', householdId });
    }
  } catch {
    // Couldn't send (offline, expired session, …) — fall back to opening the
    // chat so the reply isn't silently lost.
    await openApp('/#chat', { type: 'chat', householdId });
  }
}

// Focus an existing window (and tell it where to go) or cold-open the PWA on
// the deep-link hash.
async function openApp(url, data) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    if ('focus' in client) {
      await client.focus();
      client.postMessage({ type: 'notification-navigate', url, data });
      return;
    }
  }
  if (self.clients.openWindow) {
    await self.clients.openWindow(url);
  }
}
