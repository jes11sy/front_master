/**
 * ✅ FIX #151: Утилиты для обработки сетевых ошибок и retry логики
 * Добавлен fetch retry logic для frontend master
 */

export type NetworkErrorType = 
  | 'NETWORK_ERROR'      // Нет интернета
  | 'TIMEOUT'            // Таймаут
  | 'SERVER_ERROR'       // 5xx ошибки сервера
  | 'CLIENT_ERROR'       // 4xx ошибки клиента
  | 'ABORT'              // Запрос отменен
  | 'UNKNOWN'            // Неизвестная ошибка

export interface NetworkError extends Error {
  type: NetworkErrorType
  statusCode?: number
  retryable: boolean
}

/**
 * Определить тип сетевой ошибки
 */
export function classifyNetworkError(error: any): NetworkError {
  // Ошибки сети (нет интернета, DNS проблемы)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      ...error,
      type: 'NETWORK_ERROR',
      message: 'Нет подключения к интернету. Проверьте соединение.',
      retryable: true,
    }
  }

  // Таймаут
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return {
      ...error,
      type: 'TIMEOUT',
      message: 'Превышено время ожидания. Попробуйте еще раз.',
      retryable: true,
    }
  }

  // Отмена запроса (не AbortError от таймаута)
  if (error.name === 'AbortError') {
    return {
      ...error,
      type: 'ABORT',
      message: 'Запрос был отменен',
      retryable: false,
    }
  }

  // HTTP ошибки
  if (error.statusCode) {
    // 5xx - ошибки сервера (можно повторить)
    if (error.statusCode >= 500) {
      return {
        ...error,
        type: 'SERVER_ERROR',
        message: `Ошибка сервера (${error.statusCode}). Попробуйте позже.`,
        retryable: true,
      }
    }

    // 4xx - ошибки клиента (не повторять)
    if (error.statusCode >= 400) {
      return {
        ...error,
        type: 'CLIENT_ERROR',
        message: error.message || `Ошибка запроса (${error.statusCode})`,
        retryable: false,
      }
    }
  }

  // Неизвестная ошибка
  return {
    ...error,
    type: 'UNKNOWN',
    message: error.message || 'Произошла неизвестная ошибка',
    retryable: false,
  }
}

/**
 * Опции для retry
 */
export interface RetryOptions {
  maxRetries?: number      // Максимум попыток (по умолчанию 3)
  retryDelay?: number      // Задержка между попытками в мс (по умолчанию 1000)
  backoff?: boolean        // Экспоненциальная задержка (по умолчанию true)
  timeout?: number         // Таймаут на один запрос в мс (по умолчанию 30000)
  retryOn?: NetworkErrorType[]  // На какие ошибки повторять
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoff: true,
  timeout: 30000,
  retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
}

/**
 * Выполнить fetch с автоматическими повторными попытками
 * 
 * Особенности:
 * - Автоматический retry для 502/503/504 ошибок (cold start / nginx upstream issues)
 * - Экспоненциальный backoff
 * - Настраиваемый таймаут
 * - Классификация ошибок
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions }
): Promise<Response> {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options?.retryOptions }
  const fetchOptions = { ...options }
  delete (fetchOptions as any).retryOptions

  let lastError: NetworkError | null = null
  let lastResponse: Response | null = null
  
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      // Добавляем таймаут к запросу
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), retryOptions.timeout)
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      // 🔧 Автоматический retry для 502/503/504 (cold start / nginx upstream issues)
      // Эти ошибки часто происходят когда бэкенд "просыпается" после простоя
      if ((response.status === 502 || response.status === 503 || response.status === 504) && 
          attempt < retryOptions.maxRetries &&
          retryOptions.retryOn.includes('SERVER_ERROR')) {
        
        lastResponse = response
        
        // Вычисляем задержку (с экспоненциальным backoff)
        const delay = retryOptions.backoff
          ? retryOptions.retryDelay * Math.pow(2, attempt)
          : retryOptions.retryDelay
        
        // Логируем попытку
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `🔄 502/503/504 retry ${attempt + 1}/${retryOptions.maxRetries} ` +
            `for ${url} after ${delay}ms (status: ${response.status})`
          )
        }
        
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Если ответ получен и не 502/503/504 - возвращаем его
      return response
      
    } catch (error: any) {
      const networkError = classifyNetworkError(error)
      lastError = networkError
      
      // Последняя попытка - выбрасываем ошибку
      if (attempt === retryOptions.maxRetries) {
        throw networkError
      }
      
      // Проверяем можно ли повторить этот тип ошибки
      if (!networkError.retryable || !retryOptions.retryOn.includes(networkError.type)) {
        throw networkError
      }
      
      // Вычисляем задержку (с экспоненциальным backoff если включено)
      const delay = retryOptions.backoff
        ? retryOptions.retryDelay * Math.pow(2, attempt)
        : retryOptions.retryDelay
      
      // Логируем попытку (только в development)
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🔄 Retry attempt ${attempt + 1}/${retryOptions.maxRetries} ` +
          `for ${url} after ${delay}ms (error: ${networkError.type})`
        )
      }
      
      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // Если все попытки исчерпаны и был 502/503/504 ответ - возвращаем его
  if (lastResponse) {
    return lastResponse
  }
  
  // Этот код не должен выполниться, но TypeScript требует
  throw lastError || new Error('Unknown error in fetchWithRetry')
}

/**
 * Получить читаемое сообщение об ошибке для пользователя
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (!error) return 'Произошла неизвестная ошибка'
  
  const networkError = classifyNetworkError(error)
  
  switch (networkError.type) {
    case 'NETWORK_ERROR':
      return '❌ Нет подключения к интернету. Проверьте сеть и попробуйте снова.'
    
    case 'TIMEOUT':
      return '⏱️ Превышено время ожидания. Сервер не отвечает. Попробуйте позже.'
    
    case 'SERVER_ERROR':
      return '🔧 Ошибка на сервере. Мы уже работаем над устранением проблемы.'
    
    case 'CLIENT_ERROR':
      return networkError.message || '❌ Ошибка запроса. Проверьте введенные данные.'
    
    case 'ABORT':
      return 'Запрос был отменен'
    
    default:
      return networkError.message || 'Произошла ошибка. Попробуйте еще раз.'
  }
}

/**
 * Проверить доступен ли сервер (ping)
 */
export async function checkServerHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(`${baseUrl}/health`, {
      method: 'GET',
      retryOptions: {
        maxRetries: 1,
        timeout: 5000,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Безопасно распарсить JSON с fallback
 */
export async function safeJsonParse<T>(response: Response, fallback: T): Promise<T> {
  try {
    const text = await response.text()
    if (!text) return fallback
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}
