/*
 * Service worker do End Zone Analytics (app instalável e leitura offline).
 *  - Páginas: rede primeiro; sem conexão, a última versão guardada (ou a página inicial).
 *  - /assets/*: arquivos com hash no nome nunca mudam — cache primeiro.
 *  - /data/*: rede primeiro, com cópia para uso offline (no máximo MAX_DATA arquivos).
 *  - /api/* (placar ao vivo, notícias, relatos de erro): nunca passa pelo cache.
 * Notificações de pontuação do "Meu time" também saem por aqui (showNotification).
 */
const VERSION = 'v1';
const PAGES = `eza-pages-${VERSION}`;
const ASSETS = `eza-assets-${VERSION}`;
const DATA = `eza-data-${VERSION}`;
const MAX_DATA = 150;
const MAX_ASSETS = 120;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([PAGES, ASSETS, DATA]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('eza-') && !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(request, { ignoreSearch: cacheName === DATA })) ?? (fallbackUrl ? await cache.match(fallbackUrl) : undefined);
    if (hit) return hit;
    throw new Error('offline');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, PAGES, '/').finally(() => trim(PAGES, 40)));
  } else if (url.pathname.startsWith('/assets/')) {
    // Arquivos antigos (de versões anteriores do site) saem pelo limite: o cache não cresce sem fim.
    event.respondWith(cacheFirst(req).finally(() => trim(ASSETS, MAX_ASSETS)));
  } else if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(req, DATA).finally(() => trim(DATA, MAX_DATA)));
  }
});

// Clique na notificação: abre (ou foca) o site.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).origin === self.location.origin);
      return open ? open.focus() : self.clients.openWindow('/');
    }),
  );
});
