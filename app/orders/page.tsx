"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Order {
  id: number
  rk: string
  city: string
  typeOrder: string
  clientName: string
  phone: string
  address: string
  dateMeeting: string
  statusOrder: string
  result: number | null
  avitoName: string | null
  typeEquipment: string
  problem: string
  note: string | null
  createDate: string
  closingData?: string
  operator?: {
    id: number
    name: string
    login: string
  }
  master?: {
    id: number
    name: string
    cities: string
  }
}

// Функция для сортировки заказов по статусам и датам
const sortOrders = (orders: Order[]) => {
  // Порядок статусов
  const statusOrder: Record<string, number> = {
    'Ожидает': 1,
    'Принял': 2,
    'В пути': 3,
    'В работе': 4,
    'Модерн': 5,
    'Готово': 6,
    'Отказ': 7,
    'Незаказ': 8
  }

  return [...orders].sort((a, b) => {
    // Сначала сортируем по статусу
    const statusA = statusOrder[a.statusOrder] || 999
    const statusB = statusOrder[b.statusOrder] || 999
    
    if (statusA !== statusB) {
      return statusA - statusB
    }

    // Внутри статуса сортируем по дате
    // Для статусов Готово, Отказ, Незаказ - по дате закрытия
    // Для остальных - по дате встречи
    const useClosingDate = ['Готово', 'Отказ', 'Незаказ'].includes(a.statusOrder)
    
    const dateA = useClosingDate 
      ? (a.closingData || a.dateMeeting)
      : a.dateMeeting
    const dateB = useClosingDate 
      ? (b.closingData || b.dateMeeting)
      : b.dateMeeting

    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
}

function OrdersContent() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Состояние для данных
  const [orders, setOrders] = useState<Order[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  
  // Таймаут для загрузки - если больше 10 секунд, принудительно показываем контент
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('[OrdersPage] Force stop loading after 10s')
        setLoading(false)
        if (orders.length === 0) {
          setError('Не удалось загрузить заказы. Попробуйте обновить страницу.')
        }
      }, 10000) // 10 секунд
      
      return () => clearTimeout(timeout)
    }
  }, [loading, orders.length])

  // Загрузка данных
  const loadOrders = async () => {
    if (isLoading) return
    
    try {
      setIsLoading(true)
      setLoading(true)
      setError(null)
      
      console.log('[OrdersPage] Loading orders with params:', {
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter,
        city: cityFilter,
        search: searchTerm
      })
      
      const response = await apiClient.getOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        city: cityFilter || undefined,
        search: searchTerm || undefined,
      } as any)
      
      console.log('[OrdersPage] Response received:', response)
      
      // Проверяем успешность ответа
      if (!response.success) {
        throw new Error(response.error || 'Ошибка загрузки заказов')
      }
      
      // Устанавливаем заказы как есть (бэкенд уже сортирует)
      const ordersData = Array.isArray(response.data?.orders) ? response.data.orders : []
      
      console.log('[OrdersPage] Orders data:', ordersData.length, 'orders')
      console.log('[OrdersPage] First order:', ordersData[0])
      
      setOrders(ordersData)
      setAllStatuses(['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ'])
      setPagination(response.data?.pagination || {
        page: 1,
        limit: itemsPerPage,
        total: 0,
        totalPages: 0
      })
      setIsInitialized(true)
      
      // Принудительно убираем loading если данные пришли
      if (ordersData.length >= 0) {
        setLoading(false)
      }
    } catch (err) {
      console.error('[OrdersPage] Error loading orders:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заказов')
      logger.error('Error loading orders', err)
    } finally {
      setLoading(false)
      setIsLoading(false)
    }
  }

  // Загружаем данные при изменении фильтров и itemsPerPage (исключаем searchTerm - у него свой дебаунс)
  useEffect(() => {
    if (itemsPerPage > 0) {
      loadOrders()
    }
  }, [currentPage, statusFilter, cityFilter, itemsPerPage])

  // Обработчики фильтров
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Сбрасываем на первую страницу при поиске
  }

  // Дебаунс для поиска
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        loadOrders()
      }
    }, 500) // 500ms задержка

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleCityChange = (value: string) => {
    setCityFilter(value)
    setCurrentPage(1)
  }

  // Получаем уникальные значения для фильтров из загруженных данных
  // Оборачиваем в try-catch на случай кривых данных
  let safeOrders: Order[] = []
  let sortedOrders: Order[] = []
  let uniqueCities: string[] = []
  
  try {
    safeOrders = Array.isArray(orders) ? orders : []
    // Применяем сортировку на клиенте
    sortedOrders = sortOrders(safeOrders)
    uniqueCities = Array.from(new Set(safeOrders.map(order => order.city || 'Неизвестно')))
  } catch (err) {
    console.error('[OrdersPage] Error processing orders:', err)
    setRenderError('Ошибка обработки данных заказов. Попробуйте обновить страницу.')
    sortedOrders = []
    uniqueCities = []
  }

  // Сброс фильтров
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCityFilter('')
    setCurrentPage(1)
  }

  const handleOrderClick = (orderId: number) => {
    router.push(`/orders/${orderId}`)
  }

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  // Функция для получения цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Готово': return '#059669'
      case 'В работе': return '#3b82f6'
      case 'Ожидает': return '#f59e0b'
      case 'Отказ': return '#ef4444'
      case 'Принял': return '#10b981'
      case 'В пути': return '#8b5cf6'
      case 'Модерн': return '#f97316'
      case 'Незаказ': return '#6b7280'
      default: return '#6b7280'
    }
  }

  // Функция для получения цвета типа заказа
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Впервые': return '#10b981'
      case 'Повтор': return '#f59e0b'
      case 'Гарантия': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Если критическая ошибка рендеринга - показываем большой красный экран
  if (renderError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="max-w-md mx-4">
          <div className="bg-red-600 text-white rounded-2xl p-8 shadow-2xl">
            <div className="text-6xl mb-4 text-center">⚠️</div>
            <h1 className="text-2xl font-bold mb-4 text-center">Критическая ошибка</h1>
            <p className="text-lg mb-6 text-center">{renderError}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white text-red-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-all"
            >
              🔄 Обновить страницу
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Заголовок */}
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Мои заказы</h1>

            {/* Состояние загрузки */}
            {loading && !error && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {!loading && error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6 animate-slide-in-left">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-3xl">❌</div>
                  <div className="flex-1">
                    <p className="text-red-700 font-bold text-lg mb-2">Ошибка загрузки заказов</p>
                    <p className="text-red-800 text-base mb-3 font-medium">{error}</p>
                    <p className="text-red-600 text-sm mb-4">
                      Если проблема повторяется, обратитесь к администратору
                    </p>
                  </div>
                </div>
                <button 
                  onClick={loadOrders}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-semibold"
                >
                  🔄 Попробовать снова
                </button>
              </div>
            )}

            {/* Фильтры */}
            <div className="mb-6 animate-slide-in-left">
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h2>
                  <svg
                    className={`w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200 ${
                      showFilters ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {showFilters && (
                <div className="relative z-[100] space-y-4 animate-slide-in-right">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Поиск */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Поиск (№, телефон, адрес)
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Введите номер, телефон или адрес..."
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Статус */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Статус
                      </label>
                      <Select value={statusFilter || "all"} onValueChange={(value) => handleStatusChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Все статусы" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все статусы
                          </SelectItem>
                          {Array.isArray(allStatuses) && allStatuses.map(status => (
                            <SelectItem key={status} value={status} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Город */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Город
                    </label>
                    <Select value={cityFilter || "all"} onValueChange={(value) => handleCityChange(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-full sm:w-64 bg-white border-gray-300 text-gray-800">
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                          Все города
                        </SelectItem>
                        {Array.isArray(uniqueCities) && uniqueCities.map(city => (
                          <SelectItem key={city} value={city} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Кнопки управления фильтрами */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                    >
                      Сбросить
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Десктопная таблица */}
            {!loading && !error && sortedOrders.length === 0 && (
              <div className="text-center py-8 animate-fade-in">
                <p className="text-gray-500 font-medium">Нет заказов для отображения</p>
              </div>
            )}
            
            {!loading && !error && sortedOrders.length > 0 && (
            <div className="hidden md:block animate-fade-in">
              <table className="w-full border-collapse text-xs bg-white rounded-lg shadow-lg">
                <thead>
                  <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Тип заказа</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">РК</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Город</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Имя мастера</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Телефон</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Клиент</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Адрес</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Дата встречи</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Направление</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Проблема</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">Статус</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Мастер</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(sortedOrders) && sortedOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className="border-b hover:bg-teal-50 transition-colors cursor-pointer" 
                      style={{borderColor: '#e5e7eb'}}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className="py-2 px-2 text-gray-800 font-medium">{order.id}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-800">{order.rk}</td>
                      <td className="py-2 px-2 text-gray-800">{order.city}</td>
                      <td className="py-2 px-2 text-gray-800">{order.avitoName || '-'}</td>
                      <td className="py-2 px-2 text-gray-800">{order.phone}</td>
                      <td className="py-2 px-2 text-gray-800">{order.clientName}</td>
                      <td className="py-2 px-2 text-gray-800">{order.address}</td>
                      <td className="py-2 px-2 text-gray-800">{formatDate(order.dateMeeting)}</td>
                      <td className="py-2 px-2 text-gray-800">{order.typeEquipment}</td>
                      <td className="py-2 px-2 text-gray-800">{order.problem}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                          {order.statusOrder}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-800">{order.master?.name || '-'}</td>
                      <td className="py-2 px-2 text-gray-800 font-semibold">{order.result ? `${order.result.toLocaleString()} ₽` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Мобильные карточки */}
            {!loading && !error && sortedOrders.length > 0 && (
            <div className="md:hidden space-y-4 animate-fade-in">
              {Array.isArray(sortedOrders) && sortedOrders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-teal-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-semibold">#{order.id}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                        {order.typeOrder}
                      </span>
                    </div>
                    <span className="text-gray-800 font-semibold">{order.result ? `${order.result.toLocaleString()} ₽` : '-'}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Клиент:</span>
                      <span className="text-gray-800">{order.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Город:</span>
                      <span className="text-gray-800">{order.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Дата встречи:</span>
                      <span className="text-gray-800">{order.dateMeeting ? new Date(order.dateMeeting).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC'
                      }) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Мастер:</span>
                      <span className="text-gray-800">{order.master?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Проблема:</span>
                      <span className="text-gray-800">{order.problem}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                        {order.statusOrder}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}


            {/* Пагинация */}
            {!loading && !error && sortedOrders.length > 0 && (pagination?.totalPages || 0) > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2 flex-wrap animate-fade-in">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  ←
                </button>
                
                {(() => {
                  const totalPages = pagination?.totalPages || 0
                  const pages = []
                  
                  // Показываем максимум 7 страниц
                  const maxVisible = 7
                  let startPage = Math.max(1, currentPage - 3)
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1)
                  
                  // Корректируем если не хватает страниц в конце
                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1)
                  }
                  
                  // Добавляем первую страницу и многоточие если нужно
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md"
                      >
                        1
                      </button>
                    )
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                      )
                    }
                  }
                  
                  // Добавляем видимые страницы
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                          currentPage === i
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md'
                        }`}
                      >
                        {i}
                      </button>
                    )
                  }
                  
                  // Добавляем последнюю страницу и многоточие если нужно
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                      )
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md"
                      >
                        {totalPages}
                      </button>
                    )
                  }
                  
                  return pages
                })()}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination?.totalPages || 0, currentPage + 1))}
                  disabled={currentPage === (pagination?.totalPages || 0)}
                  className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return <OrdersContent />
}