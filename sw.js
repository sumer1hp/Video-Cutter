// sw.js - Service Worker для Video Cutter
const CACHE_NAME = 'video-cutter-v1.2';
const urlsToCache = [
  './',
  './index.html',
  './styles/main.css',
  './js/app.js',
  './js/videoManager.js',
  './js/markersManager.js',
  './js/segmentsManager.js',
  './js/exportManager.js',
  './js/uiManager.js',
  './js/storageManager.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
  // ❌ УДАЛЕНО: FFmpeg из кеша!
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker: Установка');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Кеширование файлов');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Установлен');
        return self.skipWaiting();
      })
  );
});

// Активация
self.addEventListener('activate', (event) => {
  console.log('🔥 Service Worker: Активация');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаление старого кеша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Активирован');
      return self.clients.claim();
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // ❌ НЕ кешируем и НЕ перехватываем FFmpeg и видео
  if (
    event.request.url.includes('ffmpeg') ||
    event.request.url.includes('blob:') ||
    event.request.destination === 'video' ||
    event.request.url.includes('unpkg.com') ||
    event.request.url.includes('jsdelivr.net')
  ) {
    return; // Пропускаем — загружаем напрямую из сети
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('./index.html'))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
