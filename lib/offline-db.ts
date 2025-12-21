/**
 * Offline Database для Master Front
 * Хранит данные для работы в оффлайн режиме
 */

const DB_NAME = 'master_offline_db'
const DB_VERSION = 1

// Хранилища
const STORES = {
  PROFILE: 'profile',
  ORDERS: 'orders',
  SYNC_QUEUE: 'sync_queue',
  PHOTOS: 'photos',
}

interface MasterProfile {
  id: number
  login: string
  name: string
  role: 'master'
  savedAt: number
  expiresAt: number
}

interface CachedOrder {
  id: string
  data: any
  cachedAt: number
}

interface SyncQueueItem {
  id: string
  type: 'status_change' | 'comment' | 'photo' | 'order_update'
  orderId: string
  data: any
  createdAt: number
  attempts: number
}

interface CachedPhoto {
  id: string
  orderId: string
  blob: Blob
  filename: string
  uploadedAt: number
}

/**
 * Открывает или создает IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Хранилище профиля
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE)
      }

      // Хранилище заказов
      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        const ordersStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' })
        ordersStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Очередь синхронизации
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
        syncStore.createIndex('createdAt', 'createdAt', { unique: false })
        syncStore.createIndex('orderId', 'orderId', { unique: false })
      }

      // Хранилище фотографий
      if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
        const photosStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' })
        photosStore.createIndex('orderId', 'orderId', { unique: false })
      }
    }
  })
}

// ==================== ПРОФИЛЬ ====================

/**
 * Сохраняет профиль мастера для оффлайн доступа
 */
export async function saveProfile(profile: Omit<MasterProfile, 'savedAt' | 'expiresAt'>): Promise<void> {
  console.log('[OfflineDB] Saving profile:', profile.login)
  try {
    const db = await openDB()
    const masterProfile: MasterProfile = {
      ...profile,
      savedAt: Date.now(),
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 дней
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PROFILE, 'readwrite')
      const store = transaction.objectStore(STORES.PROFILE)
      const request = store.put(masterProfile, 'current_master')

      request.onsuccess = () => {
        console.log('[OfflineDB] Profile saved successfully')
        resolve()
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to save profile:', error)
    throw error
  }
}

/**
 * Получает сохраненный профиль мастера
 */
export async function getProfile(): Promise<MasterProfile | null> {
  console.log('[OfflineDB] Getting profile...')
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PROFILE, 'readonly')
      const store = transaction.objectStore(STORES.PROFILE)
      const request = store.get('current_master')

      request.onsuccess = () => {
        const profile = request.result as MasterProfile | undefined

        if (!profile) {
          console.log('[OfflineDB] No profile found')
          resolve(null)
          return
        }

        // Проверяем срок действия
        if (Date.now() > profile.expiresAt) {
          console.log('[OfflineDB] Profile expired')
          resolve(null)
          return
        }

        console.log('[OfflineDB] Profile found:', profile.login)
        resolve(profile)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to get profile:', error)
    return null
  }
}

/**
 * Удаляет сохраненный профиль
 */
export async function clearProfile(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PROFILE, 'readwrite')
      const store = transaction.objectStore(STORES.PROFILE)
      const request = store.delete('current_master')

      request.onsuccess = () => {
        console.log('[OfflineDB] Profile cleared')
        resolve()
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to clear profile:', error)
    throw error
  }
}

// ==================== ЗАКАЗЫ ====================

/**
 * Кеширует заказы для оффлайн доступа
 */
export async function cacheOrders(orders: any[]): Promise<void> {
  console.log('[OfflineDB] Caching', orders.length, 'orders')
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ORDERS, 'readwrite')
      const store = transaction.objectStore(STORES.ORDERS)

      orders.forEach(order => {
        // Проверяем разные варианты ID
        const orderId = order.id || order._id || order.orderId
        
        if (!orderId && orderId !== 0) {
          console.warn('[OfflineDB] Order without ID:', order)
          return
        }

        // ВСЕГДА преобразуем в строку для единообразия
        const orderIdStr = String(orderId)

        const cachedOrder: CachedOrder = {
          id: orderIdStr,
          data: order,
          cachedAt: Date.now(),
        }
        
        console.log('[OfflineDB] Caching order with ID:', orderIdStr, '(original:', orderId, 'type:', typeof orderId, ')')
        store.put(cachedOrder)
      })

      transaction.oncomplete = () => {
        console.log('[OfflineDB] Orders cached successfully')
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        console.error('[OfflineDB] Transaction error:', transaction.error)
        reject(transaction.error)
      }
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to cache orders:', error)
    throw error
  }
}

/**
 * Получает закешированные заказы
 */
export async function getCachedOrders(): Promise<any[]> {
  console.log('[OfflineDB] Getting cached orders...')
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ORDERS, 'readonly')
      const store = transaction.objectStore(STORES.ORDERS)
      const request = store.getAll()

      request.onsuccess = () => {
        const cachedOrders = request.result as CachedOrder[]
        const orders = cachedOrders.map(co => co.data)
        console.log('[OfflineDB] Found', orders.length, 'cached orders')
        resolve(orders)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to get cached orders:', error)
    return []
  }
}

/**
 * Получает один закешированный заказ по ID
 */
export async function getCachedOrder(orderId: string | number): Promise<any | null> {
  const orderIdStr = String(orderId) // ВСЕГДА преобразуем в строку
  console.log('[OfflineDB] Getting cached order:', orderIdStr, '(original:', orderId, 'type:', typeof orderId, ')')
  
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ORDERS, 'readonly')
      const store = transaction.objectStore(STORES.ORDERS)
      const request = store.get(orderIdStr)

      request.onsuccess = () => {
        const cachedOrder = request.result as CachedOrder | undefined
        if (cachedOrder) {
          console.log('[OfflineDB] ✅ Found cached order:', orderIdStr)
          resolve(cachedOrder.data)
        } else {
          console.log('[OfflineDB] ❌ Order not found in cache:', orderIdStr)
          // Попробуем найти среди всех заказов для отладки
          const getAllRequest = store.getAll()
          getAllRequest.onsuccess = () => {
            const allOrders = getAllRequest.result as CachedOrder[]
            console.log('[OfflineDB] 📊 Total cached orders:', allOrders.length)
            console.log('[OfflineDB] 📋 Cached order IDs:', allOrders.map(o => `${o.id} (${typeof o.id})`).join(', '))
            resolve(null)
          }
          getAllRequest.onerror = () => resolve(null)
        }
      }
      request.onerror = () => {
        console.error('[OfflineDB] Error getting order:', request.error)
        reject(request.error)
      }
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to get cached order:', error)
    return null
  }
}

// ==================== ОЧЕРЕДЬ СИНХРОНИЗАЦИИ ====================

/**
 * Добавляет действие в очередь синхронизации
 */
export async function addToSyncQueue(
  type: SyncQueueItem['type'],
  orderId: string,
  data: any
): Promise<void> {
  console.log('[OfflineDB] Adding to sync queue:', type, orderId)
  try {
    const db = await openDB()

    const item: SyncQueueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      orderId,
      data,
      createdAt: Date.now(),
      attempts: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const request = store.add(item)

      request.onsuccess = () => {
        console.log('[OfflineDB] Added to sync queue:', item.id)
        resolve()
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to add to sync queue:', error)
    throw error
  }
}

/**
 * Получает все элементы из очереди синхронизации
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const index = store.index('createdAt')
      const request = index.getAll()

      request.onsuccess = () => {
        const items = request.result as SyncQueueItem[]
        console.log('[OfflineDB] Sync queue has', items.length, 'items')
        resolve(items)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to get sync queue:', error)
    return []
  }
}

/**
 * Удаляет элемент из очереди синхронизации
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const request = store.delete(itemId)

      request.onsuccess = () => {
        console.log('[OfflineDB] Removed from sync queue:', itemId)
        resolve()
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to remove from sync queue:', error)
    throw error
  }
}

/**
 * Увеличивает счетчик попыток для элемента в очереди
 */
export async function incrementSyncAttempts(itemId: string): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const getRequest = store.get(itemId)

      getRequest.onsuccess = () => {
        const item = getRequest.result as SyncQueueItem
        if (item) {
          item.attempts += 1
          store.put(item)
        }
      }

      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to increment sync attempts:', error)
  }
}

/**
 * Очищает всю очередь синхронизации
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[OfflineDB] Sync queue cleared')
        resolve()
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to clear sync queue:', error)
    throw error
  }
}

// ==================== УТИЛИТЫ ====================

/**
 * Проверяет, есть ли данные для оффлайн работы
 */
export async function hasOfflineData(): Promise<boolean> {
  const profile = await getProfile()
  return profile !== null
}

/**
 * Очищает все оффлайн данные
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PROFILE, STORES.ORDERS, STORES.SYNC_QUEUE, STORES.PHOTOS],
        'readwrite'
      )

      transaction.objectStore(STORES.PROFILE).clear()
      transaction.objectStore(STORES.ORDERS).clear()
      transaction.objectStore(STORES.SYNC_QUEUE).clear()
      transaction.objectStore(STORES.PHOTOS).clear()

      transaction.oncomplete = () => {
        console.log('[OfflineDB] All offline data cleared')
        db.close()
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('[OfflineDB] Failed to clear offline data:', error)
    throw error
  }
}

