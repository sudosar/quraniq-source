// QuranIQ Service Worker — v36 (Periodic Background Sync)
const CACHE_NAME = 'quraniq-v40';
const PUZZLE_CHECK_TAG = 'quraniq-puzzle-check';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './js/app.js',
  './js/connections.js',
  './js/deduction.js',
  './js/scramble.js',
  './js/utils.js',
  './js/wordle.js',
  './js/onboarding.js',
  './js/bugreport.js',
  './js/analytics.js',
  './puzzles.js',
  './data/quran_words.json'
];

// ── Install: pre-cache assets ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Periodic Background Sync ─────────────────────────────────────
// Fires even when the tab is closed (Chrome 80+, Edge 80+).
// The browser wakes the service worker at roughly the registered
// interval and fires this event.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === PUZZLE_CHECK_TAG) {
    event.waitUntil(checkAndNotify());
  }
});

// ── Message handler (for client-triggered checks) ────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_PUZZLE') {
    event.waitUntil(checkAndNotify());
  }
});

// ── Core: check for new puzzle and send notification ─────────────
async function checkAndNotify() {
  try {
    // Fetch today's puzzle with cache-bust
    const resp = await fetch('data/daily_puzzle.json?t=' + Date.now(), {
      cache: 'no-store'
    });
    if (!resp.ok) return;

    const data = await resp.json();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Only notify if the puzzle is for today
    if (data.date !== todayStr) return;

    // Check if we already notified today (stored in IndexedDB-like KV via Cache API)
    const notifCache = await caches.open('quraniq-notif-state');
    const lastNotif = await notifCache.match('last-notified-date');
    if (lastNotif) {
      const lastDate = await lastNotif.text();
      if (lastDate === todayStr) return; // Already notified today
    }

    // Check if user has notifications enabled (stored as a cache entry)
    const prefResp = await notifCache.match('notifications-enabled');
    if (!prefResp) return; // User hasn't enabled notifications
    const pref = await prefResp.text();
    if (pref !== 'true') return;

    // Send the notification
    await self.registration.showNotification('QuranIQ', {
      body: 'New daily puzzles are ready! Test your Quranic knowledge.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'quraniq-daily',
      renotify: true,
      data: { url: './' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'play', title: 'Play Now' }
      ]
    });

    // Mark today as notified
    await notifCache.put(
      'last-notified-date',
      new Response(todayStr)
    );
  } catch (e) {
    // Silently fail — will retry on next sync
  }
}

// ── Handle notification clicks ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing QuranIQ tab
      for (const client of windowClients) {
        if (client.url.includes('quraniq') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});

// ── Fetch: network-first for everything ──────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests (analytics, fonts API, Google Apps Script, audio CDN)
  if (url.origin !== location.origin) return;

  // Network-first strategy: try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline fallback
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request);
      })
  );
});
