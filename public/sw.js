// Service Worker для Master Front
// Умное кэширование с обновлением в фоне

const CACHE_NAME = 'master-front-v16'
const API_CACHE = 'master-api-cache-v1'

// Файлы для обязательного кэширования при установке
const PRECACHE_URLS = [
  '/',
  '/orders',
  '/profile',
  '/schedule',
  '/statistics',
  '/payments',
  '/login',
  '/offline.html',
]

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v16...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell')
      // Кэшируем с опцией reload чтобы получить свежие версии
      return Promise.all(
        PRECACHE_URLS.map(url => {
          return cache.add(new Request(url, { cache: 'reload' })).catch(err => {
            console.warn('[SW] Failed to cache:', url, err)
          })
        })
      )
    })
  )
  
  // Активируем новый SW сразу
  self.skipWaiting()
})

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v16...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Удаляем только старые версии основного кэша
            // НЕ удаляем API кэш - он обновляется отдельно
            return name.startsWith('master-front-v') && name !== CACHE_NAME
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  
  // Берем контроль над всеми открытыми страницами
  return self.clients.claim()
})

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return
  }

  // Пропускаем Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // Пропускаем hot-reload в dev режиме
  if (url.pathname.includes('/_next/webpack-hmr') || 
      url.pathname.includes('/_next/static/webpack/') ||
      url.pathname.includes('__nextjs')) {
    return
  }

  // API запросы - Stale-While-Revalidate (показать кэш, обновить в фоне)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // Статические файлы Next.js (_next/) - Cache First с обновлением
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Изображения - Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request))
    return
  }

  // Шрифты - Cache First
  if (request.destination === 'font') {
    event.respondWith(cacheFirst(request))
    return
  }

  // Страницы приложения - Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME))
})

/**
 * Cache First стратегия
 * Сначала кэш, если нет - сеть (и сохраняем в кэш)
 */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Network failed for:', request.url)
    return fallbackResponse(request)
  }
}

/**
 * Stale-While-Revalidate стратегия
 * Показываем из кэша СРАЗУ и обновляем в фоне
 * Лучший UX - моментальная загрузка + свежие данные
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Запускаем обновление в фоне (не ждём)
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      // Обновляем кэш свежими данными
      cache.put(request, response.clone())
      console.log('[SW] Cache updated:', request.url)
    }
    return response
  }).catch((error) => {
    console.log('[SW] Background fetch failed:', request.url)
    return null
  })

  // Если есть кэш - возвращаем его СРАЗУ
  if (cached) {
    console.log('[SW] Serving from cache:', request.url)
    return cached
  }

  // Если кэша нет - ждём сеть
  try {
    const response = await fetchPromise
    if (response) {
      return response
    }
    return fallbackResponse(request)
  } catch (error) {
    return fallbackResponse(request)
  }
}

/**
 * Fallback ответ когда ничего не работает
 */
async function fallbackResponse(request) {
  // Для HTML страниц - показываем offline.html
  if (request.headers.get('accept')?.includes('text/html')) {
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) {
      return offlinePage
    }
    
    // Встроенный HTML если offline.html не закэширован
    return new Response(
      `<!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Оффлайн</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #114643 0%, #1a6962 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: #ff9800;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
          }
          h1 { color: #114643; font-size: 24px; margin-bottom: 15px; }
          p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px; }
          button {
            background: #114643;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
          }
          button:active { background: #1a6962; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>Нет подключения</h1>
          <p>Проверьте интернет-соединение. При восстановлении связи страница обновится автоматически.</p>
          <button onclick="location.reload()">Обновить</button>
        </div>
        <script>
          window.addEventListener('online', () => location.reload());
        </script>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Для API запросов - JSON ошибка
  if (request.url.includes('/api/')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Offline', offline: true }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }

  return new Response('Offline', { status: 503 })
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting, activating new version...')
    self.skipWaiting()
  }

  // Принудительное обновление кэша
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    console.log('[SW] Force updating cache...')
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return Promise.all(
          PRECACHE_URLS.map(url => {
            return fetch(url, { cache: 'reload' })
              .then(response => {
                if (response.ok) {
                  cache.put(url, response)
                  console.log('[SW] Updated:', url)
                }
              })
              .catch(() => console.warn('[SW] Failed to update:', url))
          })
        )
      }).then(() => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true })
        }
      })
    )
  }

  // Очистка всего кэша (если нужно)
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)))
      }).then(() => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true })
        }
      })
    )
  }
})

console.log('[SW] Service Worker v16 loaded')
