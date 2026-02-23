// ═══════════════════════════════════════════════════════════
// GEPPO WORLD CUP 2026 — Service Worker
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'geppo-cup-v2';

// File da cachare subito all'installazione (app shell)
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './IMG/logo-geppocup.png',
  './IMG/poster.jpeg',
  './IMG/premiazione.jpeg',
  './IMG/atmosfera.jpeg',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&family=Poppins:wght@400;500;600;700;800&family=Teko:wght@500;600;700&display=swap'
];

// ── INSTALL: scarica e salva l'app shell ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Attiva subito senza aspettare che le vecchie tab vengano chiuse
  self.skipWaiting();
});

// ── ACTIVATE: rimuovi cache vecchie ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: strategia per tipo di richiesta ───────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Sheets API → sempre rete (dati live), no cache
  if (url.hostname === 'sheets.googleapis.com') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Google Fonts → cache first (cambiano raramente)
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

  // App shell e asset locali → cache first, fallback rete
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        // Salva in cache solo risposte valide
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => {
        // Se siamo offline e non c'è cache, mostra index.html
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
