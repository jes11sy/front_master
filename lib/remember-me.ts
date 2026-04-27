/**
 * Token Storage - хранение refresh token в IndexedDB
 * Для устойчивости на iOS PWA режиме (backup когда cookies удаляются ITP)
 * 
 * 🔒 БЕЗОПАСНОСТЬ:
 * - Хранится только refresh token (не пароль)
 * - Токен можно отозвать на сервере
 * - Срок действия 90 дней (как у токена)
 * - Данные шифруются AES-256-GCM
 * - Привязка к домену
 */

const DB_NAME = 'master_auth_db'
const DB_VERSION = 1
const STORE_NAME = 'tokens'
const TOKEN_KEY = 'refresh_token'
const EXPIRY_DAYS = 90

interface SavedToken {
  encryptedData: string
  iv: string
  salt: string
  expiresAt: number
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Проверяет доступность необходимых API
 */
function isSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof indexedDB === 'undefined') return false
  if (typeof crypto === 'undefined' || !crypto.subtle) return false
  return true
}

/**
 * Открывает или создает IndexedDB с таймаутом
 */
async function openDB(): Promise<IDBDatabase> {
  if (!isSupported()) {
    throw new Error('IndexedDB or Crypto API not supported')
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
        
        // Создаём store для токенов
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
 * Генерирует ключ шифрования
 */
async function generateEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
  const fingerprint = [
    'master_token_v1',
    window.location.origin,
    navigator.language || 'ru',
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  ].join('|')

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Шифрует токен
 */
async function encryptToken(token: string): Promise<SavedToken> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await generateEncryptionKey(salt)

  const encodedData = new TextEncoder().encode(token)
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  return {
    encryptedData: toBase64(new Uint8Array(encryptedBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
}

/**
 * Расшифровывает токен
 */
async function decryptToken(saved: SavedToken): Promise<string | null> {
  try {
    if (Date.now() > saved.expiresAt) {
      return null
    }

    const encryptedData = Uint8Array.from(atob(saved.encryptedData), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(saved.iv), c => c.charCodeAt(0))
    const salt = Uint8Array.from(atob(saved.salt), c => c.charCodeAt(0))

    const key = await generateEncryptionKey(salt)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch {
    return null
  }
}

/**
 * Сохраняет refresh token в IndexedDB
 */
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    const encrypted = await encryptToken(token)
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(encrypted, TOKEN_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    // Не бросаем ошибку — токен просто не будет сохранён
  }
}

/**
 * Получает refresh token из IndexedDB
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(TOKEN_KEY)

      request.onsuccess = async () => {
        const saved = request.result as SavedToken | undefined
        if (!saved) {
          resolve(null)
          return
        }

        const token = await decryptToken(saved)
        resolve(token)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

/**
 * Удаляет refresh token из IndexedDB
 */
export async function clearRefreshToken(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(TOKEN_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    // Игнорируем ошибки
  }
}

/**
 * Проверяет, есть ли сохранённый токен
 */
export async function hasRefreshToken(): Promise<boolean> {
  const token = await getRefreshToken()
  return token !== null
}
