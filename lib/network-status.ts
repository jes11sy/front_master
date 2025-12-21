/**
 * Утилита для проверки реального статуса сети
 * Не полагается на navigator.onLine, который может врать на iOS PWA
 */

let lastCheckTime = 0
let lastCheckResult = true
const CHECK_CACHE_DURATION = 5000 // Кешируем результат на 5 секунд

/**
 * Проверяет реальное подключение к интернету через fetch запрос
 * Кеширует результат на 5 секунд для производительности
 */
export async function isReallyOnline(): Promise<boolean> {
  const now = Date.now()
  
  // Если недавно проверяли - возвращаем кешированный результат
  if (now - lastCheckTime < CHECK_CACHE_DURATION) {
    return lastCheckResult
  }

  // Быстрая проверка через navigator.onLine
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    lastCheckTime = now
    lastCheckResult = false
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    await fetch('https://api.lead-schem.ru/api/auth/profile', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'include'
    })
    
    clearTimeout(timeoutId)
    lastCheckTime = now
    lastCheckResult = true
    return true
  } catch {
    lastCheckTime = now
    lastCheckResult = false
    return false
  }
}

/**
 * Сбрасывает кеш проверки сети
 * Полезно после явных событий online/offline
 */
export function resetNetworkCheckCache() {
  lastCheckTime = 0
}

