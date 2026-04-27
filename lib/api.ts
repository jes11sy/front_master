// API клиент для работы с бэкендом
// ✅ FIX #151: Добавлен fetch retry logic
import { logger } from './logger'
import { fetchWithRetry, classifyNetworkError, getUserFriendlyErrorMessage, type NetworkError } from './fetch-with-retry'
import * as notificationsApi from './api/domains/notifications'
import * as scheduleApi from './api/domains/schedule'
import * as pushApi from './api/domains/push'
import { getApiBaseUrl } from './config/env'

const API_BASE_URL = getApiBaseUrl()

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string
  private isRefreshing: boolean = false
  private refreshSubscribers: Array<() => void> = []
  
  // ✅ FIX: Mutex для предотвращения race condition при параллельных refresh запросах
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // 🍪 Токены теперь хранятся в httpOnly cookies на сервере
    // Не нужно их получать из localStorage
  }

  /**
   * Очистка пользовательских данных из localStorage
   * Токены хранятся в httpOnly cookies и очищаются на сервере
   */
  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
    }
  }

  /**
   * Обновление access токена с помощью refresh токена из httpOnly cookie
   * 🍪 Токены передаются автоматически через cookies
   * ✅ FIX: Mutex для предотвращения race condition при параллельных refresh запросах
   * Если несколько запросов одновременно получают 401, только один делает refresh,
   * остальные ждут его результат — это предотвращает token reuse detection на backend
   */
  private async refreshAccessToken(): Promise<boolean> {
    // Если refresh уже выполняется - ждём его результат
    if (this.refreshPromise) {
      logger.debug('[Auth] Refresh already in progress, waiting...')
      return this.refreshPromise
    }
    
    // Запускаем refresh и сохраняем Promise для других запросов
    this.refreshPromise = this.doRefreshToken()
    
    try {
      return await this.refreshPromise
    } finally {
      // Сбрасываем Promise после завершения (успех или ошибка)
      this.refreshPromise = null
    }
  }

  /**
   * Реальная логика обновления токена (вызывается только один раз при параллельных запросах)
   */
  private async doRefreshToken(): Promise<boolean> {
    try {
      logger.debug('[Auth] Starting token refresh')
      
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true', // Указываем что используем cookie mode
        },
        credentials: 'include', // Отправляем cookies
        body: JSON.stringify({}), // Пустое тело для Fastify
      })

      if (!response.ok) {
        logger.warn('[Auth] Token refresh failed', { status: response.status })
        return false
      }

      const data = await response.json()

      if (data?.success && data?.data?.refreshToken) {
        try {
          const { saveRefreshToken } = await import('./remember-me')
          await saveRefreshToken(data.data.refreshToken)
        } catch (error) {
          logger.warn('[Auth] Failed to persist refresh token after refresh')
        }
      }
      
      // Токены обновлены в httpOnly cookies на сервере
      logger.debug('[Auth] Token refresh successful')
      return data.success === true
    } catch (error) {
      logger.error('[Auth] Token refresh error', { error: String(error) })
      return false
    }
  }

  // Подписка на обновление токена
  private subscribeTokenRefresh(callback: () => void) {
    this.refreshSubscribers.push(callback)
  }

  // Оповещение подписчиков об обновлении токена
  private onTokenRefreshed() {
    this.refreshSubscribers.forEach(callback => callback())
    this.refreshSubscribers = []
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 2,
    isRetryAfterRefresh: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Use-Cookies': 'true', // 🍪 Указываем что используем cookie mode
      ...(options.headers as Record<string, string>),
    }

    // 🍪 Токены передаются автоматически через httpOnly cookies
    // Не добавляем Authorization header

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // ✅ FIX #151: Используем fetchWithRetry для автоматических повторных попыток
        // при 502/503/504 ошибках (cold start) и сетевых проблемах
        const response = await fetchWithRetry(url, {
          ...options,
          headers,
          credentials: 'include', // 🍪 Отправляем cookies с каждым запросом
          cache: 'no-store', // Отключаем кэширование на уровне fetch
          retryOptions: {
            maxRetries: 3,
            retryDelay: 1000,
            backoff: true,
            timeout: 15000, // 15 секунд таймаут на запрос
            retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
          },
        })

        // Проверяем, что ответ является JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Сервер вернул неожиданный формат ответа')
        }

        const data = await response.json()

        // Обрабатываем 401 ошибку - пытаемся обновить токен
        // НО: Если мы на странице /login, просто возвращаем ошибку без refresh (избегаем бесконечного цикла)
        const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login')
        if (response.status === 401 && !isRetryAfterRefresh && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && !isOnLoginPage) {
          
          // Если уже идет процесс обновления, ждем его завершения
          if (this.isRefreshing) {
            return new Promise<ApiResponse<T>>((resolve, reject) => {
              this.subscribeTokenRefresh(() => {
                // Повторяем запрос после обновления токена
                this.request<T>(endpoint, options, retries, true)
                  .then(resolve)
                  .catch(reject)
              })
            })
          }

          this.isRefreshing = true

          try {
            const refreshSuccess = await this.refreshAccessToken()
            
            if (refreshSuccess) {
              this.isRefreshing = false
              this.onTokenRefreshed()
              
              // Повторяем оригинальный запрос - токен обновлен в cookie
              return this.request<T>(endpoint, options, retries, true)
            } else {
              this.isRefreshing = false
              // Оповещаем подписчиков даже при неудаче, чтобы они не зависли
              this.onTokenRefreshed()
              this.clearToken()
              
              // Перенаправляем на страницу логина ТОЛЬКО если мы НЕ уже на /login
              // Это предотвращает бесконечный цикл редиректов
              if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login'
              }
              
              // Выбрасываем специальную ошибку, чтобы не показывать toast
              throw new Error('SESSION_EXPIRED')
            }
          } catch (refreshError: any) {
            this.isRefreshing = false
            // Оповещаем подписчиков даже при ошибке
            this.onTokenRefreshed()
            this.clearToken()
            
            // Перенаправляем на страницу логина ТОЛЬКО если мы НЕ уже на /login
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
            
            // Выбрасываем специальную ошибку, чтобы не показывать toast
            throw new Error('SESSION_EXPIRED')
          }
        }

        // 🚫 НЕ повторяем запросы с 401/403/404 ошибками
        if (!response.ok) {
          // Для 401, 403 и 404 сразу выбрасываем ошибку без retry
          // 401 тут означает что мы на странице login и не нужно пытаться обновить токен
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            throw new Error(data.error || data.message || `Ошибка ${response.status}`)
          }
          
          throw new Error(data.error || `Ошибка сервера: ${response.status}`)
        }

        return data
      } catch (error: any) {
        // Если это ошибка истечения сессии, сразу выбрасываем её без повторов
        if (error.message === 'SESSION_EXPIRED') {
          throw error
        }
        
        // ✅ FIX #151: Улучшенная обработка ошибок с классификацией
        // fetchWithRetry уже делает retry, так что здесь только финальная обработка
        if (attempt === retries) {
          // Используем классификацию сетевых ошибок
          const networkError = classifyNetworkError(error)
          
          // Показываем пользователю понятное сообщение
          if (networkError.type === 'NETWORK_ERROR') {
            throw new Error(getUserFriendlyErrorMessage(error))
          }
          
          if (networkError.type === 'TIMEOUT') {
            throw new Error('Превышено время ожидания ответа от сервера. Попробуйте еще раз.')
          }
          
          if (error.message?.includes('CORS')) {
            throw new Error('Ошибка CORS. Сервер не отвечает на preflight запросы')
          }
          
          throw error
        }
        
        // Если это не последняя попытка, ждем перед повтором
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error('Все попытки исчерпаны')
  }

    /**
     * 🍪 Аутентификация через httpOnly cookies
     * 
     * @param login - Логин пользователя (мастера)
     * @param password - Пароль пользователя
     *   ⚠️ SECURITY: Пароль передаётся в открытом виде только по HTTPS
     *   - НЕ логировать в консоль/файлы
     *   - НЕ сохранять в localStorage/sessionStorage
     *   - Хэшируется на сервере через bcrypt (12 rounds)
     *   - Минимум 6 символов (валидация на бэкенде)
     * @returns Promise с данными пользователя (без пароля)
     */
    async login(login: string, password: string) {
      const response = await this.request<{
        user: any
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          login, 
          password, 
          role: 'master' // Master фронтенд всегда использует роль master
        }),
      })

      // 🍪 Токены устанавливаются автоматически в httpOnly cookies на сервере
      
      // Сохраняем user для быстрой проверки автологина
      // ВСЕГДА сохраняем в localStorage - иначе автологин не работает после закрытия браузера
      // ✅ FIX #150: Санитизация данных перед сохранением в localStorage
      if (response.success && response.data?.user) {
        if (typeof window !== 'undefined') {
          const { sanitizeObject } = await import('./sanitize')
          const sanitizedUser = sanitizeObject(response.data.user as Record<string, unknown>)
          sessionStorage.setItem('user', JSON.stringify(sanitizedUser))
          localStorage.setItem('user', JSON.stringify(sanitizedUser))
        }
        
        // Сохраняем refresh token в IndexedDB (backup для iOS PWA)
        if ((response.data as any).refreshToken) {
          try {
            const { saveRefreshToken } = await import('./remember-me')
            await saveRefreshToken((response.data as any).refreshToken)
          } catch (error) {
            console.error('[Login] Failed to save refresh token:', error)
            // Не прерываем процесс логина
          }
        }
      }

      return response
    }

  /**
   * 🍪 Получение профиля текущего пользователя
   * Используется для проверки валидности сессии в cookies
   */
  async getProfile() {
    try {
      return await this.request<any>('/auth/profile', {
        method: 'GET',
      })
    } catch (error: any) {
      // Если ошибка SESSION_EXPIRED, не перенаправляем повторно
      // (перенаправление уже произошло в request())
      if (error.message === 'SESSION_EXPIRED') {
        return { success: false, error: 'Session expired' }
      }
      throw error
    }
  }

  /**
   * Принудительно обновить текущую сессию через refresh token.
   * Используется компонентами, которым нужен фоновый "silent refresh".
   */
  async refreshSession(): Promise<boolean> {
    return this.refreshAccessToken()
  }

  /**
   * 🍪 Выход из системы
   * Очищает httpOnly cookies на сервере и локальные данные
   */
  async logout() {
    // Очищаем refresh token из IndexedDB
    try {
      const { clearRefreshToken } = await import('./remember-me')
      await clearRefreshToken()
    } catch (error) {
      logger.error('Failed to clear refresh token', error)
    }
    
    // Уведомляем сервер (cookies будут очищены)
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include', // Отправляем cookies для идентификации
        body: JSON.stringify({}), // Пустой объект для POST запроса
      })
    } catch (error) {
      // Игнорируем ошибки сервера при выходе
    } finally {
      // Очищаем локальные данные ПОСЛЕ запроса
      this.clearToken()
    }
  }

  /**
   * 🔄 Восстановление сессии через refresh token из IndexedDB
   * Используется когда cookies удалены (iOS ITP, PWA)
   * @returns true если сессия восстановлена
   */
  async restoreSessionFromIndexedDB(): Promise<boolean> {
    try {
      const { getRefreshToken } = await import('./remember-me')
      const refreshToken = await getRefreshToken()
      
      if (!refreshToken) {
        logger.debug('No refresh token in IndexedDB')
        return false
      }
      
      logger.debug('Found refresh token in IndexedDB, attempting to restore session')
      
      // Отправляем refresh token на сервер для получения новых cookies
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }), // Передаём токен в body
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Обновляем токен в IndexedDB если пришёл новый
        if (result.data?.refreshToken) {
          const { saveRefreshToken } = await import('./remember-me')
          await saveRefreshToken(result.data.refreshToken)
        }
        
        logger.debug('Session restored from IndexedDB token')
        return true
      }
      
      // Токен невалиден — очищаем IndexedDB
      if (response.status === 401 || response.status === 403) {
        logger.debug('Refresh token from IndexedDB is invalid, clearing')
        const { clearRefreshToken } = await import('./remember-me')
        await clearRefreshToken()
      }
      
      return false
    } catch (error) {
      logger.error('Failed to restore session from IndexedDB', error)
      return false
    }
  }

  // Заказы
  async getOrders(params?: {
    page?: number
    limit?: number
    status?: string
    city?: string
    search?: string
    master?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.city) searchParams.append('city', params.city)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.master) searchParams.append('master', params.master)

    const query = searchParams.toString()
    
    try {
      const response = await this.request<any>(`/orders${query ? `?${query}` : ''}`)
      return response
    } catch (error) {
      throw error
    }
  }

  async getOrderById(id: string) {
    return this.request<any>(`/orders/${id}`)
  }

  async getCallsByOrderId(orderId: string) {
    return this.request<any[]>(`/calls/order/${orderId}`)
  }

  async createOrder(orderData: any) {
    return this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async updateOrder(id: string, orderData: any) {
    return this.request<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    })
  }

  async deleteOrder(id: string) {
    return this.request<any>(`/orders/${id}`, {
      method: 'DELETE',
    })
  }

  async getMasterStatistics(params?: {
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<any[]>(`/reports/statistics/master${query ? `?${query}` : ''}`)
  }

  async getMasterProfile() {
    return this.request<any>('/masters/profile')
  }

  // Мастера (Users Service)
  async getMasters(city?: string) {
    const url = city ? `/masters?city=${encodeURIComponent(city)}` : '/masters'
    const response = await this.request<any>(url)
    return response.data || []
  }
  
  async getCurrentUser() {
    try {
      // 🍪 С httpOnly cookies получаем данные через API
      const response = await this.getProfile()
      return response.data || null
    } catch (error) {
      logger.error('Error getting current user', error)
      return null
    }
  }

  /**
   * Получить сохраненного пользователя из localStorage/sessionStorage
   * Для быстрой проверки перед запросом к API
   */
  getSavedUser(): any | null {
    if (typeof window === 'undefined') return null
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user')
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  /**
   * 🍪 Проверка аутентификации через API
   * Нельзя проверить httpOnly cookies на клиенте - нужен запрос к серверу
   * Добавлен таймаут 5 секунд для PWA/мобильных устройств
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Таймаут 5 секунд для проверки авторизации
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      )
      
      await Promise.race([this.getProfile(), timeoutPromise])
      return true
    } catch {
      return false
    }
  }

  async getMasterById(id: string) {
    const response = await this.request<any>(`/masters/${id}`)
    return response.data
  }

  // Касса (Cash Service)
  async getCashRecords(params?: {
    page?: number
    limit?: number
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)

    const query = searchParams.toString()
    const response = await this.request<any>(`/cash${query ? `?${query}` : ''}`)
    return response.data || []
  }

  // Пользователи
  async getUsers() {
    return this.request<any[]>('/users')
  }

  // Уведомления
  async getNotifications() {
    return notificationsApi.getNotifications((endpoint, options) => this.request(endpoint, options))
  }

  async markNotificationAsRead(notificationId: string) {
    return notificationsApi.markNotificationAsRead(
      (endpoint, options) => this.request(endpoint, options),
      notificationId
    )
  }

  async markAllNotificationsAsRead() {
    return notificationsApi.markAllNotificationsAsRead((endpoint, options) => this.request(endpoint, options))
  }

  async deleteNotification(notificationId: string) {
    return notificationsApi.deleteNotification(
      (endpoint, options) => this.request(endpoint, options),
      notificationId
    )
  }

  // Сдача на проверку (Cash Service - Handover)
  async getMasterCashSubmissions(params?: {
    status?: string
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)

    const query = searchParams.toString()
    const response = await this.request<any>(`/handover${query ? `?${query}` : ''}`)
    return response
  }

  async submitCashForReview(orderId: number, receiptFile?: File) {
    try {
      let cashReceiptDoc: string | undefined

      // Если есть файл - загружаем его в S3 через files-service
      if (receiptFile) {
        const formData = new FormData()
        formData.append('file', receiptFile)

        const uploadUrl = `${this.baseURL}/files/upload?folder=director/cash/cashreceipt_doc`

        // 🍪 Используем credentials: 'include' для отправки httpOnly cookies
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'X-Use-Cookies': 'true',
          },
          credentials: 'include',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Ошибка загрузки файла: ${uploadResponse.status}`)
        }

        const uploadResult = await uploadResponse.json()
        
        if (uploadResult.success && uploadResult.data?.key) {
          cashReceiptDoc = uploadResult.data.key
        }
      }

      // Отправляем запрос на обновление статуса в orders-service
      const result = await this.request(`/orders/${orderId}/submit-cash`, {
        method: 'PATCH',
        body: JSON.stringify({
          cashReceiptDoc,
        }),
      })
      
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка отправки сдачи'
      }
    }
  }

  // Создать handover (сдачу мастера)
  async createHandover(data: {
    period: 'daily' | 'weekly' | 'monthly'
    periodStart: string
    periodEnd: string
    totalAmount: number
    totalOrders: number
    note?: string
  }) {
    return this.request('/handover', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Получить баланс мастера
  async getMasterBalance(masterId: number) {
    const response = await this.request<any>(`/cash/balance/${masterId}`)
    return response.data
  }

  // Авито API
  async getAvitoProfiles() {
    return this.request<any[]>('/avito/profiles')
  }

  async getAvitoChats(avitoName: string, params?: {
    limit?: number
    offset?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const query = searchParams.toString()
    return this.request<any[]>(`/avito/${avitoName}/chats${query ? `?${query}` : ''}`)
  }

  async getAvitoChat(avitoName: string, chatId: string) {
    return this.request<any>(`/avito/${avitoName}/chats/${chatId}`)
  }

  async getAvitoChatMessages(avitoName: string, chatId: string, params?: {
    limit?: number
    offset?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const query = searchParams.toString()
    return this.request<any[]>(`/avito/${avitoName}/chats/${chatId}/messages${query ? `?${query}` : ''}`)
  }

  async sendAvitoMessage(avitoName: string, chatId: string, text: string) {
    return this.request<any>(`/avito/${avitoName}/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  async markAvitoChatAsRead(avitoName: string, chatId: string) {
    return this.request<any>(`/avito/${avitoName}/chats/${chatId}/read`, {
      method: 'POST',
    })
  }

  async getOrderAvitoChat(orderId: string) {
    return this.request<any>(`/orders/${orderId}/avito-chat`)
  }

  async openAvitoChat(orderId: string) {
    return this.request<any>(`/avito/orders/${orderId}/chat/open`, {
      method: 'POST',
    })
  }

  // ✅ FIX #151: Используем fetchWithRetry для FormData с retry logic
  // request() не подходит, т.к. устанавливает Content-Type: application/json
  async uploadAvitoImage(avitoName: string, formData: FormData) {
    const url = `${this.baseURL}/avito/${avitoName}/upload-images`
    
    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'X-Use-Cookies': 'true',
          // НЕ устанавливаем Content-Type - браузер сам установит multipart/form-data с boundary
        },
        credentials: 'include',
        body: formData,
        retryOptions: {
          maxRetries: 2,
          timeout: 60000, // 60 секунд для загрузки изображений
          retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Ошибка загрузки изображения' }))
        return { success: false, error: error.message || 'Ошибка загрузки изображения' }
      }

      return response.json()
    } catch (error: any) {
      return { success: false, error: getUserFriendlyErrorMessage(error) }
    }
  }

  async sendAvitoImageMessage(avitoName: string, chatId: string, imageId: string) {
    return this.request<any>(`/avito/${avitoName}/chats/${chatId}/image`, {
      method: 'POST',
      body: JSON.stringify({ image_id: imageId }),
    })
  }

  // ✅ FIX #151: Новые методы для работы с Avito Messenger с retry logic
  async getAvitoMessages(chatId: string, avitoAccountName: string, limit: number = 100): Promise<any[]> {
    const response = await fetchWithRetry(
      `${this.baseURL}/avito-messenger/chats/${chatId}/messages?avitoAccountName=${avitoAccountName}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        retryOptions: {
          maxRetries: 3,
          timeout: 15000,
          retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Ошибка получения сообщений' }))
      throw new Error(error.message || 'Ошибка получения сообщений')
    }

    const result = await response.json()
    return result.data?.messages || []
  }

  async sendAvitoMessageNew(chatId: string, text: string, avitoAccountName: string): Promise<any> {
    const response = await fetchWithRetry(
      `${this.baseURL}/avito-messenger/chats/${chatId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ text, avitoAccountName }),
        retryOptions: {
          maxRetries: 2, // Меньше retry для POST запросов
          timeout: 15000,
          retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Ошибка отправки сообщения' }))
      throw new Error(error.message || 'Ошибка отправки сообщения')
    }

    const result = await response.json()
    return result.data
  }

  async markAvitoChatAsReadNew(chatId: string, avitoAccountName: string): Promise<void> {
    const response = await fetchWithRetry(
      `${this.baseURL}/avito-messenger/chats/${chatId}/read`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ avitoAccountName }),
        retryOptions: {
          maxRetries: 2,
          timeout: 10000,
          retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Ошибка отметки чата как прочитанного' }))
      throw new Error(error.message || 'Ошибка отметки чата как прочитанного')
    }
  }

  async getAvitoVoiceUrlsNew(avitoAccountName: string, voiceIds: string[]): Promise<{ [key: string]: string }> {
    const response = await fetchWithRetry(
      `${this.baseURL}/avito-messenger/voice-files?avitoAccountName=${avitoAccountName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ voiceIds }),
        retryOptions: {
          maxRetries: 3,
          timeout: 15000,
          retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Ошибка получения URL голосовых сообщений' }))
      throw new Error(error.message || 'Ошибка получения URL голосовых сообщений')
    }

    const result = await response.json()
    return result.data || {}
  }

  // ✅ FIX #151: Улучшенный uploadFile с retry logic
  async uploadFile(file: File, folder?: string): Promise<any> {
    let url = `/files/upload`
    if (folder) {
      url += `?folder=${encodeURIComponent(folder)}`
    }

    const fullUrl = `${this.baseURL}${url}`
    
    // Функция для создания FormData (нужно пересоздавать при retry)
    const createFormData = () => {
      const formData = new FormData()
      formData.append('file', file)
      return formData
    }
    
    // Внутренняя функция для загрузки с retry
    const uploadWithRetry = async (retryCount: number = 0): Promise<any> => {
      const maxRetries = 3
      
      try {
        const response = await fetchWithRetry(fullUrl, {
          method: 'POST',
          headers: {
            'X-Use-Cookies': 'true',
          },
          credentials: 'include',
          body: createFormData(),
          retryOptions: {
            maxRetries: 2, // Меньше retry для загрузки файлов
            timeout: 60000, // 60 секунд для загрузки файлов
            retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
          },
        })

        // Обработка 401 - пытаемся обновить токен
        if (response.status === 401 && retryCount < maxRetries) {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            return uploadWithRetry(retryCount + 1)
          } else {
            logger.error('Token refresh failed during file upload')
            throw new Error('Не удалось обновить токен. Пожалуйста, войдите снова.')
          }
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(error.message || 'Ошибка загрузки файла')
        }

        return response.json()
      } catch (error: any) {
        // Если это сетевая ошибка и у нас есть попытки - повторяем
        const networkError = classifyNetworkError(error)
        if (networkError.retryable && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          return uploadWithRetry(retryCount + 1)
        }
        throw error
      }
    }

    return uploadWithRetry()
  }

  // Инициация callback звонка через Mango Office
  async initiateCallback(orderId: number, masterPhone: string) {
    return this.request<any>('/calls/initiate-callback', {
      method: 'POST',
      body: JSON.stringify({ orderId, masterPhone }),
    })
  }

  // ==================== SCHEDULE API ====================

  /**
   * Получить своё расписание (для мастера)
   */
  async getOwnSchedule(params?: { startDate?: string; endDate?: string }) {
    return scheduleApi.getOwnSchedule((endpoint, options) => this.request(endpoint, options), params)
  }

  /**
   * Обновить своё расписание (для мастера)
   */
  async updateOwnSchedule(days: Array<{ date: string; isWorkDay: boolean }>) {
    return scheduleApi.updateOwnSchedule((endpoint, options) => this.request(endpoint, options), days)
  }

  /**
   * Получить расписание мастера по ID (для директора/админа)
   */
  async getMasterSchedule(masterId: number, params?: { startDate?: string; endDate?: string }) {
    return scheduleApi.getMasterSchedule(
      (endpoint, options) => this.request(endpoint, options),
      masterId,
      params
    )
  }

  /**
   * Обновить расписание мастера по ID (для директора/админа)
   */
  async updateMasterSchedule(masterId: number, days: Array<{ date: string; isWorkDay: boolean }>) {
    return scheduleApi.updateMasterSchedule(
      (endpoint, options) => this.request(endpoint, options),
      masterId,
      days
    )
  }

  // ==================== PUSH NOTIFICATIONS API ====================

  /**
   * Подписаться на push-уведомления (мастер)
   */
  async subscribeToPush(subscription: PushSubscriptionJSON) {
    return pushApi.subscribeToPush((endpoint, options) => this.request(endpoint, options), subscription)
  }

  /**
   * Отписаться от push-уведомлений (мастер)
   */
  async unsubscribeFromPush(endpoint: string) {
    return pushApi.unsubscribeFromPush((apiEndpoint, options) => this.request(apiEndpoint, options), endpoint)
  }

  /**
   * Отправить тестовое push-уведомление (мастер)
   */
  async sendTestPush() {
    return pushApi.sendTestPush((endpoint, options) => this.request(endpoint, options))
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
