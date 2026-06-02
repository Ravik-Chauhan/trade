// Minimal service worker: offline-first navigation cache + notification focus.
const CACHE = 'tickflow-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html']).catch(() => {})))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  // network-first for navigations, cache fallback for offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))))
    return
  }
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req)))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      if (self.clients.openWindow) return self.clients.openWindow('./')
    })
  )
})
