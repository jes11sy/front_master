/**
 * Утилита для очистки всех кэшей (Service Worker + IndexedDB)
 * Используется для решения проблем с кривым кэшем
 */

let isClearing = false
let hasCleared = false

/**
 * Очищает все кэши приложения
 * Выполняется только один раз за сессию
 */
export async function clearAllCaches(): Promise<void> {
  // Если уже очищали в этой сессии - пропускаем
  if (hasCleared) {
    console.log('[CacheCleaner] Already cleared in this session, skipping')
    return
  }

  // Если уже идет очистка - пропускаем
  if (isClearing) {
    console.log('[CacheCleaner] Already clearing, skipping')
    return
  }

  try {
    isClearing = true
    console.log('[CacheCleaner] Starting cache cleanup...')

    // 1. Очистка Service Worker кэшей
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys()
      if (cacheNames.length > 0) {
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('[CacheCleaner] ✅ Deleted', cacheNames.length, 'SW caches')
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
        console.log('[CacheCleaner] ✅ Cleared IndexedDB')
      } catch (e) {
        console.log('[CacheCleaner] IndexedDB clear skipped:', e)
      }
    }

    // 3. Удаление всех Service Workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        await Promise.all(registrations.map(reg => reg.unregister()))
        console.log('[CacheCleaner] ✅ Unregistered', registrations.length, 'service workers')
      }
    }

    hasCleared = true
    console.log('[CacheCleaner] ✅ Cache cleanup completed successfully')
  } catch (err) {
    console.error('[CacheCleaner] ❌ Error during cache cleanup:', err)
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

