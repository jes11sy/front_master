// Service Worker для Push-уведомлений (Мастер)
// Этот файл статичный и копируется в public при билде

const CACHE_NAME = 'master-cache-v1';

// Функция проверки настроек уведомлений
async function checkNotificationSettings(data) {
  try {
    // Получаем настройки из IndexedDB
    const disabledCitiesStr = await getFromIndexedDB('master-push-disabled-cities');
    const disabledTypesStr = await getFromIndexedDB('master-push-disabled-types');
    
    const disabledCities = disabledCitiesStr ? JSON.parse(disabledCitiesStr) : [];
    const disabledTypes = disabledTypesStr ? JSON.parse(disabledTypesStr) : [];
    
    // Проверяем город
    if (data.data?.city && disabledCities.includes(data.data.city)) {
      console.log('[SW Master] Notification blocked by city filter:', data.data.city);
      return false;
    }
    
    // Проверяем тип уведомления
    if (data.type && disabledTypes.includes(data.type)) {
      console.log('[SW Master] Notification blocked by type filter:', data.type);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('[SW Master] Error checking notification settings:', error);
    return true; // По умолчанию показываем уведомление
  }
}

// Функция для работы с IndexedDB в Service Worker
async function getFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('master-settings', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get(key);
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result?.value || null);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

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

  event.waitUntil(
    checkNotificationSettings(data).then(shouldShow => {
      if (!shouldShow) {
        console.log('[SW Master] Notification filtered out by user settings');
        return;
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
      
      return self.registration.showNotification(title, options)
        .then(() => console.log('[SW Master] Notification shown successfully'))
        .catch(err => console.error('[SW Master] Failed to show notification:', err));
    })
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Master] Notification clicked, data:', event.notification.data);
  event.notification.close();

  const data = event.notification.data || {};
  
  // Обработка действий
  if (event.action === 'dismiss') {
    console.log('[SW Master] Dismiss action - closing notification');
    return;
  }

  // Определяем целевой URL
  let targetUrl = '/orders'; // По умолчанию
  
  // Если есть orderId - формируем URL к странице заказа
  if (data.orderId) {
    targetUrl = `/orders/${data.orderId}`;
  } else if (data.url) {
    targetUrl = data.url;
  }

  console.log('[SW Master] Target URL:', targetUrl);

  // Формируем полный URL для корректной работы в PWA
  const fullUrl = new URL(targetUrl, self.location.origin).href;
  console.log('[SW Master] Full URL:', fullUrl);

  event.waitUntil(
    (async () => {
      try {
        const clientList = await self.clients.matchAll({ 
          type: 'window', 
          includeUncontrolled: true 
        });
        
        console.log('[SW Master] Active clients:', clientList.length);
        
        // Ищем уже открытое окно приложения
        let appClient = null;
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          console.log('[SW Master] Client', i, ':', client.url);
          
          if (client.url.startsWith(self.location.origin)) {
            appClient = client;
            break;
          }
        }
        
        if (appClient) {
          console.log('[SW Master] Found existing app window');
          
          // Отправляем сообщение клиенту для навигации через Next.js router
          appClient.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            orderId: data.orderId,
            data: data,
          });
          
          // Фокусируемся на окне
          await appClient.focus();
          console.log('[SW Master] Window focused and message sent');
          
        } else {
          // Если нет открытых окон - открываем новое
          console.log('[SW Master] No active windows, opening new:', fullUrl);
          const newClient = await self.clients.openWindow(fullUrl);
          console.log('[SW Master] New window opened:', newClient ? 'success' : 'failed');
        }
        
      } catch (error) {
        console.error('[SW Master] Error handling notification click:', error);
        // Последняя попытка - просто открыть окно
        try {
          await self.clients.openWindow(fullUrl);
        } catch (e) {
          console.error('[SW Master] Failed to open window:', e);
        }
      }
    })()
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
