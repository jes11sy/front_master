// API клиент для работы с бэкендом
import { logger } from './logger'
import { sortOrders } from './order-sort'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

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
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
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
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      
      // Токены обновлены в httpOnly cookies на сервере
      return data.success === true
    } catch (error) {
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
    retries: number = 3,
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
        // Создаем AbortController для таймаута (совместимо со старыми браузерами)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 секунд

        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include', // 🍪 Отправляем cookies с каждым запросом
          signal: controller.signal,
          cache: 'no-store', // Отключаем кэширование на уровне fetch
        }).finally(() => clearTimeout(timeoutId))

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
        
        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === retries) {
          // Обрабатываем различные типы ошибок
          if (error.name === 'AbortError') {
            throw new Error('Превышено время ожидания ответа от сервера')
          }
          
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Сервер недоступен. Проверьте подключение к интернету и убедитесь, что бэкенд запущен')
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

    // 🍪 Аутентификация через httpOnly cookies
    async login(login: string, password: string, remember: boolean = false) {
      const response = await this.request<{
        user: any
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          login, 
          password, 
          role: 'master', // Master фронтенд всегда использует роль master
          rememberMe: remember // Передаем флаг на сервер
        }),
      })

      // 🍪 Токены устанавливаются автоматически в httpOnly cookies на сервере
      
      // Сохраняем user для быстрой проверки автологина
      // ВСЕГДА сохраняем в localStorage - иначе автологин не работает после закрытия браузера
      if (response.success && response.data?.user) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('user', JSON.stringify(response.data.user))
          localStorage.setItem('user', JSON.stringify(response.data.user))
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
   * 🍪 Выход из системы
   * Очищает httpOnly cookies на сервере и локальные данные
   */
  async logout() {
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

  async uploadAvitoImage(avitoName: string, formData: FormData) {
    return this.request<any>(`/avito/${avitoName}/upload-images`, {
      method: 'POST',
      body: formData,
    })
  }

  async sendAvitoImageMessage(avitoName: string, chatId: string, imageId: string) {
    return this.request<any>(`/avito/${avitoName}/chats/${chatId}/image`, {
      method: 'POST',
      body: JSON.stringify({ image_id: imageId }),
    })
  }

  // Новые методы для работы с Avito Messenger (как у директора)
  async getAvitoMessages(chatId: string, avitoAccountName: string, limit: number = 100): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages?avitoAccountName=${avitoAccountName}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения сообщений')
    }

    const result = await response.json()
    return result.data?.messages || []
  }

  async sendAvitoMessageNew(chatId: string, text: string, avitoAccountName: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
      body: JSON.stringify({ text, avitoAccountName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отправки сообщения')
    }

    const result = await response.json()
    return result.data
  }

  async markAvitoChatAsReadNew(chatId: string, avitoAccountName: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/avito-messenger/chats/${chatId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
      body: JSON.stringify({ avitoAccountName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отметки чата как прочитанного')
    }
  }

  async getAvitoVoiceUrlsNew(avitoAccountName: string, voiceIds: string[]): Promise<{ [key: string]: string }> {
    const response = await fetch(`${this.baseURL}/avito-messenger/voice-files?avitoAccountName=${avitoAccountName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
      body: JSON.stringify({ voiceIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения URL голосовых сообщений')
    }

    const result = await response.json()
    return result.data || {}
  }

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
    
    // ✅ ИСПРАВЛЕНИЕ: Используем низкоуровневый fetch с credentials для загрузки файлов
    // request() не подходит т.к. он добавляет Content-Type: application/json
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'X-Use-Cookies': 'true', // Указываем что используем cookie mode
      },
      credentials: 'include', // 🍪 Отправляем httpOnly cookies с токенами
      body: createFormData(), // Создаем новый FormData
    })

    // Обработка 401 - пытаемся обновить токен
    if (response.status === 401) {
      console.log('[API] Upload failed with 401, refreshing token...')
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        console.log('[API] Token refreshed, retrying upload...')
        // ✅ ИСПРАВЛЕНИЕ: Создаем НОВЫЙ FormData для retry (старый уже использован)
        const retryResponse = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'X-Use-Cookies': 'true',
          },
          credentials: 'include',
          body: createFormData(), // Создаем новый FormData
        })
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(error.message || 'Ошибка загрузки файла после обновления токена')
        }
        
        console.log('[API] Upload successful after token refresh')
        return retryResponse.json()
      } else {
        console.error('[API] Token refresh failed')
        throw new Error('Не удалось обновить токен. Пожалуйста, войдите снова.')
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || 'Ошибка загрузки файла')
    }

    const result = await response.json()
    return result
  }

  // Инициация callback звонка через Mango Office
  async initiateCallback(orderId: number, masterPhone: string) {
    return this.request<any>('/calls/initiate-callback', {
      method: 'POST',
      body: JSON.stringify({ orderId, masterPhone }),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
