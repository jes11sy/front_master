"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import AuthGuard from "@/components/auth-guard"
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

// Импортируем оптимизированный CustomSelect
import CustomSelect from '@/components/optimized/CustomSelect'

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

// Функция для сортировки заказов по статусам и датам (вынесена за пределы компонента)
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
  const [masterFilter, setMasterFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [openSelect, setOpenSelect] = useState<string | null>(null)

  // Состояние для данных
  const [orders, setOrders] = useState<Order[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>([])
  const [allMasters, setAllMasters] = useState<{id: number, name: string}[]>([])
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

  // Загрузка данных
  const loadOrders = async () => {
    if (isLoading) return
    
    try {
      setIsLoading(true)
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        city: cityFilter || undefined,
        search: searchTerm || undefined,
        master: masterFilter || undefined,
      } as any)
      
      setOrders(Array.isArray(response.data?.orders) ? response.data.orders : [])
      setAllStatuses(['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ'])
      setAllMasters([])
      setPagination(response.data?.pagination || {
        page: 1,
        limit: itemsPerPage,
        total: 0,
        totalPages: 0
      })
      setIsInitialized(true)
    } catch (err) {
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
  }, [currentPage, statusFilter, cityFilter, masterFilter, itemsPerPage])

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

  const handleMasterChange = (value: string) => {
    setMasterFilter(value)
    setCurrentPage(1)
  }

  // Получаем уникальные значения для фильтров из загруженных данных
  const safeOrders = Array.isArray(orders) ? orders : []
  // Применяем сортировку
  const sortedOrders = sortOrders(safeOrders)
  const uniqueCities = Array.from(new Set(safeOrders.map(order => order.city)))

  // Сброс фильтров
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCityFilter('')
    setMasterFilter('')
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
      minute: '2-digit'
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

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl animate-fade-in" style={{borderColor: '#114643'}}>
            

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-in-left">
                <p className="text-red-600 font-medium">{error}</p>
                <button 
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  Попробовать снова
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
                      <CustomSelect
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={[
                          { value: '', label: 'Все статусы' },
                          ...(Array.isArray(allStatuses) ? allStatuses : []).map(status => ({ value: status, label: status }))
                        ]}
                        placeholder="Все статусы"
                        compact={true}
                        selectId="status"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Город */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Город
                      </label>
                      <CustomSelect
                        value={cityFilter}
                        onChange={handleCityChange}
                        options={[
                          { value: '', label: 'Все города' },
                          ...(Array.isArray(uniqueCities) ? uniqueCities : []).map(city => ({ value: city, label: city }))
                        ]}
                        placeholder="Все города"
                        compact={true}
                        selectId="city"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
                    
                    {/* Мастер */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Мастер
                      </label>
                      <CustomSelect
                        value={masterFilter}
                        onChange={handleMasterChange}
                        options={[
                          { value: '', label: 'Все мастера' },
                          ...(Array.isArray(allMasters) ? allMasters : []).map(master => ({ value: master.id.toString(), label: master.name }))
                        ]}
                        placeholder="Все мастера"
                        compact={true}
                        selectId="master"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
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

const Orders: React.FC = () => {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  )
}

export default Orders