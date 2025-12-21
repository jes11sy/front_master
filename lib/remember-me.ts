/**
 * Remember Me функционал с использованием IndexedDB и шифрования
 * Для устойчивости на iOS PWA режиме
 */

const DB_NAME = 'master_auth_db'
const DB_VERSION = 1
const STORE_NAME = 'credentials'
const CREDENTIALS_KEY = 'saved_credentials'
const EXPIRY_DAYS = 90 // Срок хранения учетных данных

interface SavedCredentials {
  encryptedData: string
  iv: string
  salt: string
  expiresAt: number
}

interface Credentials {
  login: string
  password: string
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Генерирует ключ шифрования из device fingerprint
 * Используем комбинацию userAgent, screen resolution, timezone
 */
async function generateEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
  // Создаем fingerprint устройства
  const fingerprint = [
    navigator.userAgent,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.language,
  ].join('|')

  // Импортируем fingerprint как базовый ключ
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Создаем производный ключ с использованием соли
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
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
 * Шифрует учетные данные
 */
async function encryptCredentials(credentials: Credentials): Promise<SavedCredentials> {
  // Генерируем случайную соль и IV
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Получаем ключ шифрования
  const key = await generateEncryptionKey(salt)

  // Шифруем данные
  const encodedData = new TextEncoder().encode(JSON.stringify(credentials))
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  // Конвертируем в base64 для хранения
  const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
  const ivBase64 = btoa(String.fromCharCode(...iv))
  const saltBase64 = btoa(String.fromCharCode(...salt))

  return {
    encryptedData,
    iv: ivBase64,
    salt: saltBase64,
    expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
}

/**
 * Расшифровывает учетные данные
 */
async function decryptCredentials(saved: SavedCredentials): Promise<Credentials | null> {
  try {
    // Проверяем срок действия
    if (Date.now() > saved.expiresAt) {
      console.log('[RememberMe] Credentials expired')
      return null
    }

    // Декодируем из base64
    const encryptedData = Uint8Array.from(atob(saved.encryptedData), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(saved.iv), c => c.charCodeAt(0))
    const salt = Uint8Array.from(atob(saved.salt), c => c.charCodeAt(0))

    // Получаем ключ шифрования
    const key = await generateEncryptionKey(salt)

    // Расшифровываем
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )

    const decryptedData = new TextDecoder().decode(decryptedBuffer)
    return JSON.parse(decryptedData)
  } catch (error) {
    console.error('[RememberMe] Decryption failed:', error)
    return null
  }
}

/**
 * Сохраняет учетные данные в IndexedDB
 */
export async function saveCredentials(login: string, password: string): Promise<void> {
  console.log('[RememberMe] Attempting to save credentials for:', login)
  try {
    const encrypted = await encryptCredentials({ login, password })
    console.log('[RememberMe] Credentials encrypted successfully')
    const db = await openDB()
    console.log('[RememberMe] IndexedDB opened')

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(encrypted, CREDENTIALS_KEY)

      request.onsuccess = () => {
        console.log('[RememberMe] Credentials saved successfully to IndexedDB')
        resolve()
      }
      request.onerror = () => {
        console.error('[RememberMe] Error saving to IndexedDB:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[RememberMe] Failed to save credentials:', error)
    throw error
  }
}

/**
 * Получает сохраненные учетные данные из IndexedDB
 */
export async function getSavedCredentials(): Promise<Credentials | null> {
  console.log('[RememberMe] Attempting to get saved credentials...')
  try {
    const db = await openDB()
    console.log('[RememberMe] IndexedDB opened for reading')

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(CREDENTIALS_KEY)

      request.onsuccess = async () => {
        const saved = request.result as SavedCredentials | undefined
        if (!saved) {
          console.log('[RememberMe] No saved credentials found in IndexedDB')
          resolve(null)
          return
        }

        console.log('[RememberMe] Found encrypted credentials, attempting to decrypt...')
        const credentials = await decryptCredentials(saved)
        if (credentials) {
          console.log('[RememberMe] Credentials decrypted successfully for user:', credentials.login)
        } else {
          console.log('[RememberMe] Failed to decrypt credentials (expired or invalid)')
        }
        resolve(credentials)
      }
      request.onerror = () => {
        console.error('[RememberMe] Error reading from IndexedDB:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[RememberMe] Failed to get credentials:', error)
    return null
  }
}

/**
 * Удаляет сохраненные учетные данные
 */
export async function clearSavedCredentials(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(CREDENTIALS_KEY)

      request.onsuccess = () => {
        console.log('[RememberMe] Credentials cleared')
        resolve()
      }
      request.onerror = () => reject(request.error)

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[RememberMe] Failed to clear credentials:', error)
    throw error
  }
}

/**
 * Проверяет, есть ли сохраненные учетные данные
 */
export async function hasSavedCredentials(): Promise<boolean> {
  const credentials = await getSavedCredentials()
  return credentials !== null
}

