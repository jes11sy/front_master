"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-screen'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useDesignStore } from '@/store/design.store'
import { sortOrders } from '@/lib/order-sort'

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

// Ключ для сохранения позиции прокрутки
const SCROLL_POSITION_KEY = 'master_orders_scroll_position'

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // Инициализация из URL query params (для сохранения состояния при возврате назад)
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page')
    return page ? parseInt(page, 10) : 1
  })
  const [itemsPerPage] = useState(15)
  
  // Отдельные поля поиска
  const [searchId, setSearchId] = useState(() => searchParams.get('searchId') || '')
  const [searchPhone, setSearchPhone] = useState(() => searchParams.get('searchPhone') || '')
  const [searchAddress, setSearchAddress] = useState(() => searchParams.get('searchAddress') || '')
  
  // Табы статусов: all, Ожидает, Принял, В работе, completed (Готово+Отказ+Незаказ)
  const [statusTab, setStatusTab] = useState<string>(() => searchParams.get('tab') || 'all')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [cityFilter, setCityFilter] = useState(() => searchParams.get('city') || '')
  const [showFilters, setShowFilters] = useState(() => {
    return !!(searchParams.get('status') || searchParams.get('city') || 
              searchParams.get('searchId') || searchParams.get('searchPhone') || searchParams.get('searchAddress'))
  })

  // Черновые состояния для панели фильтров (применяются только по кнопке)
  const [draftSearchId, setDraftSearchId] = useState('')
  const [draftSearchPhone, setDraftSearchPhone] = useState('')
  const [draftSearchAddress, setDraftSearchAddress] = useState('')
  const [draftStatusFilter, setDraftStatusFilter] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')

  // Состояние для данных
  const [orders, setOrders] = useState<Order[]>([])
  const [allStatuses] = useState<string[]>(['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  })
  
  // Ref для отмены запросов
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const isInitialMount = useRef(true)
  const hasRestoredScroll = useRef(false)
  const isBackNavigation = useRef(false)
  
  // При монтировании проверяем тип навигации
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      const navigationType = navEntries.length > 0 ? navEntries[0].type : 'navigate'
      
      if (navigationType === 'reload' || navigationType === 'navigate') {
        sessionStorage.removeItem(SCROLL_POSITION_KEY)
        isBackNavigation.current = false
      } else if (navigationType === 'back_forward') {
        isBackNavigation.current = true
      }
    }
  }, [])

  // Обновление URL с текущими фильтрами
  const updateUrlWithFilters = useCallback(() => {
    const params = new URLSearchParams()
    
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (statusTab !== 'all') params.set('tab', statusTab)
    if (searchId) params.set('searchId', searchId)
    if (searchPhone) params.set('searchPhone', searchPhone)
    if (searchAddress) params.set('searchAddress', searchAddress)
    if (statusFilter) params.set('status', statusFilter)
    if (cityFilter) params.set('city', cityFilter)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/orders?${queryString}` : '/orders'
    
    window.history.replaceState(null, '', newUrl)
  }, [currentPage, statusTab, searchId, searchPhone, searchAddress, statusFilter, cityFilter])

  // Сохранение позиции прокрутки
  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString())
    }
  }, [])

  // Восстановление позиции прокрутки
  const restoreScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined' && !hasRestoredScroll.current && isBackNavigation.current) {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10))
          hasRestoredScroll.current = true
          sessionStorage.removeItem(SCROLL_POSITION_KEY)
        }, 100)
      }
    }
  }, [])

  // Загрузка данных
  const loadOrders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    const currentRequestId = ++requestIdRef.current
    
    try {
      setLoading(true)
      setError(null)
      
      // Определяем статус на основе таба
      let effectiveStatus = statusFilter?.trim() || undefined
      if (!effectiveStatus && statusTab !== 'all') {
        if (statusTab === 'completed') {
          effectiveStatus = 'Готово,Отказ,Незаказ'
        } else {
          effectiveStatus = statusTab
        }
      }
      
      const response = await apiClient.getOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: effectiveStatus,
        city: cityFilter?.trim() || undefined,
        search: searchId?.trim() || searchPhone?.trim() || searchAddress?.trim() || undefined,
      } as any)
      
      if (currentRequestId !== requestIdRef.current) {
        return
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Ошибка загрузки заказов')
      }
      
      const ordersData = Array.isArray(response.data?.orders) ? response.data.orders : []
      
      setOrders(ordersData)
      setPagination(response.data?.pagination || {
        page: 1,
        limit: itemsPerPage,
        total: ordersData.length,
        totalPages: 1
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      if (currentRequestId !== requestIdRef.current) {
        return
      }
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заказов')
      logger.error('Error loading orders', err)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [currentPage, itemsPerPage, statusTab, statusFilter, cityFilter, searchId, searchPhone, searchAddress])

  // Загружаем данные при изменении фильтров
  useEffect(() => {
    loadOrders()
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadOrders])

  // Обновляем URL при изменении фильтров
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    updateUrlWithFilters()
  }, [updateUrlWithFilters])

  // Восстанавливаем позицию прокрутки
  useEffect(() => {
    if (!loading && orders.length > 0) {
      restoreScrollPosition()
    }
  }, [loading, orders.length, restoreScrollPosition])

  // Обработчик смены таба статусов
  const handleStatusTabChange = (tab: string) => {
    setStatusTab(tab)
    setStatusFilter('')
    setCurrentPage(1)
  }

  // Получаем уникальные города
  const { sortedOrders, uniqueCities } = useMemo(() => {
    try {
      const safeOrders = Array.isArray(orders) ? orders : []
      const sorted = sortOrders(safeOrders)
      const cities = Array.from(new Set(safeOrders.map(order => order.city || 'Неизвестно')))
      return { sortedOrders: sorted, uniqueCities: cities }
    } catch {
      return { sortedOrders: [] as Order[], uniqueCities: [] as string[] }
    }
  }, [orders])

  // Открытие панели фильтров
  const openFiltersPanel = () => {
    setDraftSearchId(searchId)
    setDraftSearchPhone(searchPhone)
    setDraftSearchAddress(searchAddress)
    setDraftStatusFilter(statusFilter)
    setDraftCityFilter(cityFilter)
    setShowFilters(true)
  }

  // Применение фильтров
  const applyFilters = () => {
    setSearchId(draftSearchId)
    setSearchPhone(draftSearchPhone)
    setSearchAddress(draftSearchAddress)
    setStatusFilter(draftStatusFilter)
    setCityFilter(draftCityFilter)
    setCurrentPage(1)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftSearchId('')
    setDraftSearchPhone('')
    setDraftSearchAddress('')
    setDraftStatusFilter('')
    setDraftCityFilter('')
    setSearchId('')
    setSearchPhone('')
    setSearchAddress('')
    setStatusFilter('')
    setCityFilter('')
    setCurrentPage(1)
    setShowFilters(false)
    window.history.replaceState(null, '', '/orders')
    sessionStorage.removeItem(SCROLL_POSITION_KEY)
  }

  const handleOrderClick = (orderId: number) => {
    saveScrollPosition()
    updateUrlWithFilters()
    router.push(`/orders/${orderId}`)
  }

  // Форматирование даты
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      const day = String(date.getUTCDate()).padStart(2, '0')
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const year = date.getUTCFullYear()
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      
      return `${day}.${month}.${year} ${hours}:${minutes}`
    } catch {
      return '-'
    }
  }

  // Стили статуса
  const getStatusStyle = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'Готово': return 'bg-green-700 text-white'
        case 'В работе': return 'bg-blue-700 text-white'
        case 'Ожидает': return 'bg-amber-600 text-white'
        case 'Отказ': return 'bg-red-700 text-white'
        case 'Принял': return 'bg-emerald-700 text-white'
        case 'В пути': return 'bg-violet-700 text-white'
        case 'Модерн': return 'bg-orange-600 text-white'
        case 'Незаказ': return 'bg-gray-600 text-white'
        default: return 'bg-gray-600 text-white'
      }
    }
    switch (status) {
      case 'Готово': return 'bg-green-600 text-white'
      case 'В работе': return 'bg-blue-600 text-white'
      case 'Ожидает': return 'bg-amber-500 text-white'
      case 'Отказ': return 'bg-red-600 text-white'
      case 'Принял': return 'bg-emerald-600 text-white'
      case 'В пути': return 'bg-violet-600 text-white'
      case 'Модерн': return 'bg-orange-500 text-white'
      case 'Незаказ': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Стили типа заказа
  const getTypeStyle = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'Впервые': return 'bg-emerald-700 text-white'
        case 'Повтор': return 'bg-amber-600 text-white'
        case 'Гарантия': return 'bg-red-700 text-white'
        default: return 'bg-gray-600 text-white'
      }
    }
    switch (type) {
      case 'Впервые': return 'bg-emerald-600 text-white'
      case 'Повтор': return 'bg-amber-500 text-white'
      case 'Гарантия': return 'bg-red-600 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#1e2530]' : 'bg-white'
    }`}>
      <div className="px-4 py-6">
        <div className="w-full">
          <div className={`transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="flex justify-center mb-4">
                  <LoadingSpinner size="lg" />
                </div>
                <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {!loading && error && (
              <div className={`rounded-lg p-4 mb-6 animate-slide-in-left ${
                isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
                <button 
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Табы статусов + иконка фильтров */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex items-center gap-2">
                {/* Табы с прокруткой */}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                  <div className={`flex gap-1 p-1 rounded-lg w-max ${
                    isDark ? 'bg-[#2a3441]' : 'bg-gray-100'
                  }`}>
                    {[
                      { id: 'all', label: 'Все' },
                      { id: 'Ожидает', label: 'Ожидает' },
                      { id: 'Принял', label: 'Принял' },
                      { id: 'В работе', label: 'В работе' },
                      { id: 'Модерн', label: 'Модерн' },
                      { id: 'completed', label: 'Завершённые' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleStatusTabChange(tab.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                          statusTab === tab.id
                            ? isDark 
                              ? 'bg-[#0d5c4b] text-white shadow-sm'
                              : 'bg-[#0d5c4b] text-white shadow-sm'
                            : isDark
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Иконка фильтров */}
                <button
                  onClick={openFiltersPanel}
                  className={`relative flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                    isDark 
                      ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-400 hover:text-teal-400'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'
                  }`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {(searchId || searchPhone || searchAddress || statusFilter || cityFilter) && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${
                      isDark ? 'border-[#1e2530]' : 'border-white'
                    }`}></span>
                  )}
                </button>
              </div>
            </div>

            {/* Выезжающая панель фильтров справа */}
            {showFilters && (
              <>
                {/* Затемнение фона */}
                <div 
                  className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                    isDark ? 'bg-black/50' : 'bg-black/30'
                  }`}
                  onClick={() => setShowFilters(false)}
                />
                
                {/* Панель фильтров */}
                <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
                  isDark ? 'bg-[#2a3441]' : 'bg-white'
                }`}>
                  {/* Заголовок панели - только на десктопе */}
                  <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Закрыть"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка скрыть - только на мобильных */}
                  <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Скрыть фильтры
                    </button>
                  </div>

                  {/* Содержимое фильтров */}
                  <div className="p-4 space-y-4">
                    {/* Секция: Поиск */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>№ заказа</label>
                        <input
                          type="text"
                          value={draftSearchId}
                          onChange={(e) => setDraftSearchId(e.target.value)}
                          placeholder="ID заказа..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Телефон</label>
                        <input
                          type="text"
                          value={draftSearchPhone}
                          onChange={(e) => setDraftSearchPhone(e.target.value)}
                          placeholder="Номер телефона..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Адрес</label>
                        <input
                          type="text"
                          value={draftSearchAddress}
                          onChange={(e) => setDraftSearchAddress(e.target.value)}
                          placeholder="Адрес..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Основные фильтры */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Основные</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
                        <Select value={draftStatusFilter || "all"} onValueChange={(value) => setDraftStatusFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все статусы" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все статусы</SelectItem>
                            {allStatuses.map(status => (
                              <SelectItem key={status} value={status} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                        <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все города" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все города</SelectItem>
                            {uniqueCities.map(city => (
                              <SelectItem key={city} value={city} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Нижняя панель с кнопками */}
                  <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        isDark 
                          ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Десктопная таблица */}
            {!loading && !error && sortedOrders.length === 0 && (
              <div className="text-center py-8 animate-fade-in">
                <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет заказов для отображения</p>
              </div>
            )}
            
            {!loading && !error && sortedOrders.length > 0 && (
            <div className="hidden md:block animate-fade-in">
              <table className={`w-full border-collapse text-xs rounded-lg shadow-lg ${
                isDark ? 'bg-[#2a3441]' : 'bg-white'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип заказа</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>РК</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Имя мастера</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Телефон</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Адрес</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата встречи</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Направление</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Проблема</th>
                    <th className={`text-center py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Мастер</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className={`border-b transition-colors cursor-pointer ${
                        isDark 
                          ? 'border-gray-700 hover:bg-[#3a4451]'
                          : 'border-gray-200 hover:bg-teal-50'
                      }`}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className={`py-2 px-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.id}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.rk}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.city}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.avitoName || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.phone}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.clientName}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.address}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{formatDate(order.dateMeeting)}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.typeEquipment}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.problem}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.statusOrder)}`}>
                          {order.statusOrder}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.master?.name || '-'}</td>
                      <td className={`py-2 px-2 font-semibold ${isDark ? 'text-teal-400' : 'text-gray-800'}`}>
                        {order.result && typeof order.result === 'number' 
                          ? `${order.result.toLocaleString()} ₽`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Мобильные карточки */}
            {!loading && !error && sortedOrders.length > 0 && (
            <div className="md:hidden space-y-3 animate-fade-in">
              {sortedOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                    isDark 
                      ? 'bg-[#2a3441] border-gray-700 hover:border-teal-600'
                      : 'bg-white border-gray-200 hover:border-teal-300'
                  }`}
                  onClick={() => handleOrderClick(order.id)}
                >
                  {/* Верхняя строка: ID, тип, дата */}
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${
                    isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                        {order.typeOrder}
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(order.dateMeeting)}</span>
                  </div>
                  
                  {/* Основной контент */}
                  <div className="px-3 py-2.5">
                    {/* Клиент и город */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName || 'Без имени'}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{order.city}</span>
                    </div>
                    
                    {/* Адрес */}
                    <p className={`text-xs mb-2 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.address || '—'}</p>
                    
                    {/* Проблема */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <span className={`text-xs shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{order.typeEquipment}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>·</span>
                      <span className={`text-xs line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.problem || '—'}</span>
                    </div>
                  </div>
                  
                  {/* Нижняя строка: мастер, статус, сумма */}
                  <div className={`flex items-center justify-between px-3 py-2 border-t ${
                    isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.master?.name || 'Не назначен'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.statusOrder)}`}>
                        {order.statusOrder}
                      </span>
                      {order.result && typeof order.result === 'number' && (
                        <span className={`font-bold text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                          {order.result.toLocaleString()} ₽
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Пагинация */}
            {!loading && !error && sortedOrders.length > 0 && (pagination?.totalPages || 0) > 1 && (
              <div className="mt-6 animate-fade-in">
                <OptimizedPagination
                  currentPage={currentPage}
                  totalPages={pagination?.totalPages || 0}
                  onPageChange={setCurrentPage}
                  isDark={isDark}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#1e2530]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-700 dark:text-gray-300">Загрузка заказов...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
