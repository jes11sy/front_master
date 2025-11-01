// API клиент для работы с бэкендом
import { logger } from './logger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private refreshToken: string | null = null
  private isRefreshing: boolean = false
  private refreshSubscribers: Array<(token: string) => void> = []

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Получаем токены из localStorage или sessionStorage при инициализации
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      this.refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
      
      // Запускаем проверку истечения токена
      this.startTokenExpiryCheck()
    }
  }

  // Проверка истечения токена и проактивное обновление
  private startTokenExpiryCheck() {
    if (typeof window === 'undefined') return

    // Проверяем каждые 60 секунд
    setInterval(() => {
      if (!this.token) return

      try {
        // Декодируем JWT токен
        const base64Url = this.token.split('.')[1]
        if (!base64Url) return

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )

        const payload = JSON.parse(jsonPayload)
        
        // Проверяем, когда истекает токен
        if (payload.exp) {
          const expiryTime = payload.exp * 1000 // Конвертируем в миллисекунды
          const currentTime = Date.now()
          const timeUntilExpiry = expiryTime - currentTime

          // Если токен истекает через 2 минуты или меньше, обновляем его проактивно
          if (timeUntilExpiry > 0 && timeUntilExpiry < 2 * 60 * 1000) {
            console.log('⏰ Токен скоро истечет, проактивно обновляем...')
            this.refreshAccessToken().catch(err => {
              console.error('Ошибка проактивного обновления токена:', err)
            })
          }
        }
      } catch (error) {
        // Игнорируем ошибки декодирования
      }
    }, 60000) // Проверяем каждую минуту
  }

  setToken(token: string, remember: boolean = false) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (remember) {
        // Сохраняем в localStorage для долгосрочного хранения
        localStorage.setItem('auth_token', token)
        localStorage.setItem('remember_me', 'true')
      } else {
        // Сохраняем в sessionStorage для сессии
        sessionStorage.setItem('auth_token', token)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('remember_me')
      }
    }
  }

  setRefreshToken(refreshToken: string, remember: boolean = false) {
    this.refreshToken = refreshToken
    if (typeof window !== 'undefined') {
      if (remember) {
        localStorage.setItem('refresh_token', refreshToken)
      } else {
        sessionStorage.setItem('refresh_token', refreshToken)
        localStorage.removeItem('refresh_token')
      }
    }
  }

  clearToken() {
    this.token = null
    this.refreshToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('remember_me')
      localStorage.removeItem('user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
    }
  }

  // Метод для обновления access токена с помощью refresh токена
  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      
      if (data.success && data.data?.accessToken) {
        const remember = typeof window !== 'undefined' && localStorage.getItem('remember_me') === 'true'
        this.setToken(data.data.accessToken, remember)
        
        // Если сервер вернул новый refresh токен, обновляем его тоже
        if (data.data.refreshToken) {
          this.setRefreshToken(data.data.refreshToken, remember)
        }
        
        return data.data.accessToken
      }

      return null
    } catch (error) {
      console.error('Error refreshing token:', error)
      return null
    }
  }

  // Подписка на обновление токена
  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
  }

  // Оповещение подписчиков о новом токене
  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token))
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
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          // Добавляем таймаут для запросов
          signal: AbortSignal.timeout(15000), // 15 секунд
        })

        // Проверяем, что ответ является JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Сервер вернул неожиданный формат ответа')
        }

        const data = await response.json()

        // Обрабатываем 401 ошибку - пытаемся обновить токен
        if (response.status === 401 && !isRetryAfterRefresh && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
          console.log('🔄 Получена 401 ошибка, пытаемся обновить токен...')
          
          // Если уже идет процесс обновления, ждем его завершения
          if (this.isRefreshing) {
            return new Promise<ApiResponse<T>>((resolve, reject) => {
              this.subscribeTokenRefresh((newToken: string) => {
                // Повторяем запрос с новым токеном
                this.request<T>(endpoint, options, retries, true)
                  .then(resolve)
                  .catch(reject)
              })
            })
          }

          this.isRefreshing = true

          try {
            const newToken = await this.refreshAccessToken()
            
            if (newToken) {
              console.log('✅ Токен успешно обновлен')
              this.isRefreshing = false
              this.onTokenRefreshed(newToken)
              
              // Повторяем оригинальный запрос с новым токеном
              return this.request<T>(endpoint, options, retries, true)
            } else {
              console.log('❌ Не удалось обновить токен, перенаправляем на логин')
              this.isRefreshing = false
              this.clearToken()
              
              // Перенаправляем на страницу логина
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
              
              // Выбрасываем специальную ошибку, чтобы не показывать toast
              throw new Error('SESSION_EXPIRED')
            }
          } catch (refreshError: any) {
            console.log('❌ Ошибка обновления токена:', refreshError?.message || refreshError)
            this.isRefreshing = false
            this.clearToken()
            
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
            
            // Выбрасываем специальную ошибку, чтобы не показывать toast
            throw new Error('SESSION_EXPIRED')
          }
        }

        if (!response.ok) {
          throw new Error(data.error || `Ошибка сервера: ${response.status}`)
        }

        return data
      } catch (error: any) {
        // Если это ошибка истечения сессии, сразу выбрасываем её без повторов и логирования
        if (error.message === 'SESSION_EXPIRED') {
          throw error
        }
        
        // Не логируем ошибки на последующих попытках
        if (attempt === 1) {
          console.error(`API Error (попытка ${attempt}/${retries}):`, error)
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
        console.log(`⏳ Повтор через ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error('Все попытки исчерпаны')
  }

  // Аутентификация
  async login(login: string, password: string, remember: boolean = false) {
    const response = await this.request<{
      user: any
      accessToken: string
      refreshToken: string
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password, 
        role: 'master' // Master фронтенд всегда использует роль master
      }),
    })

    // Новый формат ответа: { success, message, data: { user, accessToken, refreshToken } }
    if (response.success && response.data?.accessToken) {
      this.setToken(response.data.accessToken, remember)
      
      // Сохраняем refresh токен
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken, remember)
      }
    }

    return response
  }

  logout() {
    // Сначала очищаем локальные данные НАПРЯМУЮ и СИНХРОННО
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('remember_me')
      localStorage.removeItem('user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
    }
    
    // Сохраняем токен для отправки на сервер
    const token = this.token
    
    // Очищаем токены в памяти СРАЗУ
    this.token = null
    this.refreshToken = null
    
    // Уведомляем сервер в фоне (не ждем ответа)
    if (token) {
      fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).catch((error) => {
        // Игнорируем ошибки сервера при выходе - токен уже удален локально
        console.warn('Ошибка при выходе на сервере (игнорируется):', error)
      })
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
    return this.request<any>(`/orders${query ? `?${query}` : ''}`)
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
      // Декодируем JWT токен, чтобы получить информацию о пользователе
      if (!this.token) return null
      
      const base64Url = this.token.split('.')[1]
      if (!base64Url) return null
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      
      return JSON.parse(jsonPayload)
    } catch (error) {
      logger.error('Error decoding token', error)
      return null
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
      console.log('=== submitCashForReview START ===')
      console.log('Order ID:', orderId)
      console.log('Receipt File:', receiptFile)
      
      let cashReceiptDoc: string | undefined

      // Если есть файл - загружаем его в S3 через files-service
      if (receiptFile) {
        console.log('Uploading file to S3...')
        console.log('File name:', receiptFile.name)
        console.log('File size:', receiptFile.size)
        console.log('File type:', receiptFile.type)
        
        const formData = new FormData()
        formData.append('file', receiptFile)

        const uploadUrl = `${this.baseURL}/files/upload?folder=director/cash/cashreceipt_doc`
        console.log('Upload URL:', uploadUrl)

        // Указываем кастомную папку для чеков
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
          body: formData,
        })

        console.log('Upload response status:', uploadResponse.status)

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('Upload failed:', errorText)
          throw new Error(`Ошибка загрузки файла: ${uploadResponse.status}`)
        }

        const uploadResult = await uploadResponse.json()
        console.log('Upload result:', uploadResult)
        
        if (uploadResult.success && uploadResult.data?.key) {
          cashReceiptDoc = uploadResult.data.key
          console.log('✅ File uploaded to S3:', cashReceiptDoc)
        } else {
          console.warn('⚠️ No key in upload result')
        }
      } else {
        console.log('No file to upload')
      }

      // Отправляем запрос на обновление статуса в orders-service
      console.log('Submitting cash to orders-service...')
      console.log('cashReceiptDoc:', cashReceiptDoc)
      
      const result = await this.request(`/orders/${orderId}/submit-cash`, {
        method: 'PATCH',
        body: JSON.stringify({
          cashReceiptDoc,
        }),
      })
      
      console.log('Submit result:', result)
      console.log('=== submitCashForReview END ===')
      
      return result
    } catch (error) {
      console.error('❌ Error in submitCashForReview:', error)
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
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
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
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
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
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avitoAccountName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отметки чата как прочитанного')
    }
  }

  async uploadFile(file: File, folder?: string): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)

    let url = `${this.baseURL}/files/upload`
    if (folder) {
      url += `?folder=${encodeURIComponent(folder)}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка загрузки файла')
    }

    const result = await response.json()
    return result
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
