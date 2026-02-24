// ═══════════════════════════════════════════════════════════
// GEPPO WORLD CUP 2026 — Service Worker
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'geppo-cup-v3';

// Asset statici da cachare (NO index.html — sempre aggiornato dalla rete)
const STATIC_ASSETS = [
  './manifest.json',
  './styles.css',
  './IMG/logo-geppocup.png',
  './IMG/poster.jpeg',
  './IMG/premiazione.jpeg',
  './IMG/atmosfera.jpeg',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&family=Poppins:wght@400;500;600;700;800&family=Teko:wght@500;600;700&display=swap'
];

// ── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE: rimuovi cache vecchie ──────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // index.html → sempre dalla rete, fallback cache se offline
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Google Sheets + Supabase → sempre rete, no cache
  if (url.hostname === 'sheets.googleapis.com' || url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts → cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
      )
    );
    return;
  }

  // Immagini e altri asset locali → cache first, fallback rete
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});
