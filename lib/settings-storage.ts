/**
 * Settings Storage - хранение пользовательских настроек в IndexedDB
 * Для устойчивости на iOS PWA режиме (localStorage может очищаться ITP)
 * 
 * Хранит: тему, версию дизайна и другие настройки
 */

const DB_NAME = 'master_settings_db'
const DB_VERSION = 1
const STORE_NAME = 'settings'

export interface AppSettings {
  theme: 'light' | 'dark'
  version: 'v1' | 'v2'
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  version: 'v1',
}

/**
 * Проверяет доступность IndexedDB
 */
function isSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof indexedDB === 'undefined') return false
  return true
}

/**
 * Открывает или создает IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  if (!isSupported()) {
    throw new Error('IndexedDB not supported')
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('IndexedDB open timeout'))
    }, 5000)

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        clearTimeout(timeout)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        clearTimeout(timeout)
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      
      request.onblocked = () => {
        clearTimeout(timeout)
        reject(new Error('IndexedDB blocked'))
      }
    } catch (e) {
      clearTimeout(timeout)
      reject(e)
    }
  })
}

/**
 * Сохраняет настройки в IndexedDB
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const current = await getSettings()
    const merged = { ...current, ...settings }
    
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(merged, 'app_settings')

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('[SettingsStorage] Failed to save settings:', error)
    // Не бросаем ошибку — просто не сохраним
  }
}

/**
 * Получает настройки из IndexedDB
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('app_settings')

      request.onsuccess = () => {
        const saved = request.result as AppSettings | undefined
        resolve(saved || DEFAULT_SETTINGS)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Получает конкретную настройку
 */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const settings = await getSettings()
  return settings[key]
}

/**
 * Сохраняет конкретную настройку
 */
export async function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  await saveSettings({ [key]: value } as Partial<AppSettings>)
}
