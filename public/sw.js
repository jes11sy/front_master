// Service Worker для Master Front
// Кеширование статических файлов и оффлайн работа

const CACHE_NAME = 'master-front-v4'
const RUNTIME_CACHE = 'master-front-runtime-v4'

// Файлы для кеширования при установке
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
  console.log('[SW] Installing Service Worker...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell')
      return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
    }).catch((error) => {
      console.error('[SW] Precache failed:', error)
    })
  )
  
  // Активируем новый SW сразу
  self.skipWaiting()
})

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
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

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message, activating new version...')
    self.skipWaiting()
  }
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
  if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.includes('/_next/static/webpack/')) {
    return
  }

  // API запросы - Network First (сначала сеть, потом кеш)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Внешние API - Network First
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(request))
    return
  }

  // Статические файлы Next.js (_next/) - Cache First
  if (url.pathname.startsWith('/_next/')) {
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

  // Страницы приложения - Network First с fallback на кеш
  event.respondWith(networkFirst(request))
})

/**
 * Cache First стратегия
 * Сначала проверяем кеш, если нет - запрос к сети
 */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    console.log('[SW] Cache hit:', request.url)
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('[SW] Fetch failed:', error)
    // Возвращаем оффлайн страницу если есть
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) return offlinePage
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Network First стратегия
 * Сначала запрос к сети, если не получилось - из кеша
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    
    // Кешируем успешные ответы
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cached = await caches.match(request)
    if (cached) {
      console.log('[SW] Cache hit:', request.url)
      return cached
    }

    // Если это HTML страница - возвращаем оффлайн страницу
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline.html')
      if (offlinePage) return offlinePage
    }

    return new Response('Offline', { status: 503 })
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)))
      }).then(() => {
        event.ports[0].postMessage({ success: true })
      })
    )
  }
})

console.log('[SW] Service Worker loaded')

