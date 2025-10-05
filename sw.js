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
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://unpkg.com/@ffmpeg/ffmpeg@0.12.4/dist/ffmpeg.min.js',
  'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker: Установка');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Кеширование файлов');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('⚠️ Service Worker: Ошибка кеширования:', error);
        });
      })
      .then(() => {
        console.log('✅ Service Worker: Все файлы закешированы');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔥 Service Worker: Активация');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Удаление старого кеша', cacheName);
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
  // Пропускаем запросы к FFmpeg.wasm и большие видео файлы
  if (event.request.url.includes('ffmpeg-core') || 
      event.request.url.includes('blob:') ||
      event.request.destination === 'video') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кешированную версию или делаем запрос
        if (response) {
          console.log('📁 Service Worker: Возвращаем из кеша', event.request.url);
          return response;
        }

        console.log('🌐 Service Worker: Загружаем из сети', event.request.url);
        return fetch(event.request).then((response) => {
          // Проверяем валидный ли ответ
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Клонируем ответ
          const responseToCache = response.clone();

          // Добавляем в кеш
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch((error) => {
        console.log('❌ Service Worker: Ошибка fetch', error);
        // Можно вернуть fallback страницу
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Обработка сообщений от главного потока
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Фоновая синхронизация (опционально)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Фоновая синхронизация');
  }
});
