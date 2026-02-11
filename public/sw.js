// Service Worker для Push-уведомлений (Мастер)
// Этот файл статичный и копируется в public при билде

const CACHE_NAME = 'master-cache-v1';

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  console.log('[SW Master] Push event received');
  
  if (!event.data) {
    console.log('[SW Master] Push получен, но без данных');
    return;
  }

  let data;

  // Пробуем распарсить как JSON, если не получается - используем как текст
  try {
    data = event.data.json();
    console.log('[SW Master] Push data (JSON):', data);
  } catch (e) {
    // Если данные не JSON, создаём объект из текста
    const textData = event.data.text();
    console.log('[SW Master] Push получен как текст:', textData);
    data = {
      title: 'Новые Схемы',
      body: textData,
      type: 'text_message',
    };
  }

  // Опции уведомления
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/images/images/pwa_light.png',
    badge: data.badge || '/images/images/favicon.png',
    tag: data.tag || data.type || 'default',
    renotify: true,
    requireInteraction: data.type === 'order_assigned', // Назначение заказа требует внимания
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/orders',
      type: data.type,
      orderId: data.orderId,
      ...(data.data || {}),
    },
  };

  const title = data.title || 'Новые Схемы';
  console.log('[SW Master] Showing notification:', title);
  
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW Master] Notification shown successfully'))
      .catch(err => console.error('[SW Master] Failed to show notification:', err))
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Master] Notification clicked');
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || '/orders';

  // Обработка действий
  if (event.action === 'dismiss') {
    return;
  }

  // Для заказов открываем страницу заказа
  if (data.orderId) {
    targetUrl = `/orders/${data.orderId}`;
  }

  console.log('[SW Master] Target URL:', targetUrl);

  // Формируем полный URL для корректной работы в PWA
  const fullUrl = new URL(targetUrl, self.location.origin).href;
  console.log('[SW Master] Full URL:', fullUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('[SW Master] Found clients:', clientList.length);
        
        // Ищем уже открытое окно PWA
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW Master] Found existing client, navigating to:', fullUrl);
            
            // Сначала фокусируемся на окне
            client.focus();
            
            // Отправляем сообщение для навигации через Next.js router
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: data,
            });
            
            // Также пробуем navigate (на случай если postMessage не сработает)
            if ('navigate' in client) {
              return client.navigate(fullUrl).catch((err) => {
                console.warn('[SW Master] navigate() failed:', err);
              });
            }
            
            return Promise.resolve();
          }
        }
        
        // Если нет открытых окон - открываем новое
        console.log('[SW Master] No existing windows, opening new:', fullUrl);
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      })
      .catch((error) => {
        console.error('[SW Master] Error handling notification click:', error);
        // В случае ошибки все равно пробуем открыть новое окно
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      })
  );
});

// Закрытие уведомления
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  console.log('[SW Master] Уведомление закрыто:', data.type);
});

// Обработка изменения подписки на push
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Master] Push подписка изменилась, оповещаем клиент');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            oldSubscription: event.oldSubscription ? event.oldSubscription.toJSON() : null,
            newSubscription: event.newSubscription ? event.newSubscription.toJSON() : null,
          });
        });
      })
      .catch((error) => {
        console.error('[SW Master] Ошибка оповещения клиента:', error);
      })
  );
});

// Установка SW
self.addEventListener('install', (event) => {
  console.log('[SW Master] Installing...');
  self.skipWaiting();
});

// Активация SW
self.addEventListener('activate', (event) => {
  console.log('[SW Master] Activating...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Очистка старых кэшей
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
    ])
  );
});

// Обработка fetch для базового кэширования
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы и API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Для навигационных запросов - network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Для статики - cache first
  if (
    event.request.url.includes('/_next/static/') ||
    event.request.url.includes('/images/') ||
    event.request.url.includes('/fonts/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
  }
});

console.log('[SW Master] Service Worker loaded');
