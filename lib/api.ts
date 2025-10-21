// API клиент для работы с бэкендом
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

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Получаем токен из localStorage или sessionStorage при инициализации
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    }
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

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('remember_me')
      sessionStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
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

        if (!response.ok) {
          throw new Error(data.error || `Ошибка сервера: ${response.status}`)
        }

        return data
      } catch (error: any) {
        console.error(`API Error (попытка ${attempt}/${retries}):`, error)
        
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
    }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password, 
        role: 'MASTER' // Master фронтенд всегда использует роль MASTER
      }),
    })

    // Новый формат ответа: { success, message, data: { user, accessToken, refreshToken } }
    if (response.success && response.data?.accessToken) {
      this.setToken(response.data.accessToken, remember)
    }

    return response
  }

  async logout() {
    try {
      // Отправляем запрос на сервер для инвалидации токена (если есть токен)
      if (this.token) {
        await this.request('/v1/auth/logout', {
          method: 'POST',
        })
      }
    } catch (error) {
      // Игнорируем ошибки сервера при выходе
      console.warn('Ошибка при выходе на сервере:', error)
    } finally {
      // Всегда очищаем локальные токены
      this.clearToken()
    }
  }

  // Заказы
  async getOrders(params?: {
    page?: number
    limit?: number
    status?: string
    city?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.city) searchParams.append('city', params.city)

    const query = searchParams.toString()
    return this.request<any>(`/orders${query ? `?${query}` : ''}`)
  }

  async getOrderById(id: string) {
    return this.request<any>(`/orders/${id}`)
  }

  async getCallsByOrderId(callId: string) {
    return this.request<any[]>(`/calls/order/${callId}`)
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
    return this.request<any[]>(`/orders/statistics/master${query ? `?${query}` : ''}`)
  }

  async getMasterProfile() {
    return this.request<any>('/orders/profile/master')
  }

  // Мастера
  async getMasters() {
    return this.request<any[]>('/masters')
  }

  async getMasterById(id: string) {
    return this.request<any>(`/masters/${id}`)
  }

  // Касса
  async getCashRecords(params?: {
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    return this.request<any[]>(`/cash${query ? `?${query}` : ''}`)
  }

  // Пользователи
  async getUsers() {
    return this.request<any[]>('/users')
  }

  // Сдача на проверку
  async getMasterCashSubmissions(params?: {
    status?: string
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    return this.request<any[]>(`/cash-submissions/master${query ? `?${query}` : ''}`)
  }

  async submitCashForReview(orderId: string, amount: number, receiptDoc?: File) {
    const formData = new FormData()
    formData.append('amount', amount.toString())
    if (receiptDoc) {
      formData.append('receiptDoc', receiptDoc)
    }

    return fetch(`${this.baseURL}/cash-submissions/orders/${orderId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    }).then(response => response.json())
  }

  // Создание записи в таблице cash
  async createCashEntry(data: {
    name: string
    amount: number
    city: string
    note: string
    paymentPurpose: string
    nameCreate: string
  }) {
    return this.request('/cash', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
    return this.request<any>(`/avito/orders/${orderId}/chat`)
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
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
