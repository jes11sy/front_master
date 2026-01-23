/**
 * Утилита для очистки всех кэшей (Service Worker + IndexedDB)
 * Используется для решения проблем с кривым кэшем
 */

let isClearing = false
let hasCleared = false

const isDev = process.env.NODE_ENV === 'development'

/**
 * Очищает все кэши приложения
 * Выполняется только один раз за сессию
 */
export async function clearAllCaches(): Promise<void> {
  // Если уже очищали в этой сессии - пропускаем
  if (hasCleared) {
    return
  }

  // Если уже идет очистка - пропускаем
  if (isClearing) {
    return
  }

  try {
    isClearing = true

    // 1. Очистка Service Worker кэшей
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys()
      if (cacheNames.length > 0) {
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        if (isDev) console.log('[CacheCleaner] Deleted', cacheNames.length, 'SW caches')
      }
    }

    // 2. Очистка IndexedDB
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        const dbs = await indexedDB.databases()
        for (const db of dbs) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      } catch {
        // Silently ignore IndexedDB errors
      }
    }

    // 3. Удаление всех Service Workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        await Promise.all(registrations.map(reg => reg.unregister()))
        if (isDev) console.log('[CacheCleaner] Unregistered', registrations.length, 'service workers')
      }
    }

    hasCleared = true
  } catch {
    // Silently ignore cleanup errors
  } finally {
    isClearing = false
  }
}

/**
 * Сбрасывает флаг очистки (для тестирования)
 */
export function resetClearFlag(): void {
  hasCleared = false
}

