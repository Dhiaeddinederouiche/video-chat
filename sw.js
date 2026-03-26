const CACHE_NAME = 'video-chat-v1';
const urlsToCache = [
  '/',
  '/video-chat.html',
  '/manifest.json',
  // Add other assets like CSS, JS if any
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});