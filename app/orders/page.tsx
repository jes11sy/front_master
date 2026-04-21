"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppLoadingBlock, LoadingScreen } from '@/components/ui/loading-screen'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { NetworkError } from '@/components/ui/network-error'
import { useDesignStore } from '@/store/design.store'
import { sortOrders } from '@/lib/order-sort'
import { cn } from '@/lib/utils'

interface Order {
  id: number
  rkId: number
  rk?: { id: number; name: string }
  cityId: number
  city?: { id: number; name: string }
  typeOrder: string
  clientName: string
  phone: string
  address: string
  dateMeeting: string
  statusId: number
  status?: { id: number; name: string; code: string }
  result: number | null
  equipmentTypeId: number
  equipmentType?: { id: number; name: string }
  comment?: string
  note: string | null
  createdAt: string
  closingAt?: string
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
  avito?: { id: number; name: string }
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
      isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
    }`}>
      <div className={`px-4 ${loading ? 'py-0' : 'py-6'}`}>
        <div className="w-full">
          <div className={`transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>

            {/* Табы + фильтры: fixed (всегда видны при скролле); см. .orders-page-tabs-dock в globals.css */}
            {!loading && (
            <>
            <div
              className={cn(
                'orders-page-tabs-dock border-b border-black/[0.06] px-4 py-2.5 backdrop-blur-md dark:border-white/10',
                isDark ? 'bg-[#111113]/95' : 'bg-[#f5f5f7]/95'
              )}
            >
              <div className="mx-auto flex min-h-[40px] w-full max-w-screen-sm items-center gap-2 md:max-w-none">
                {/* Табы с прокруткой */}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 w-max">
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
                        className={`min-h-[40px] px-4 text-sm font-medium rounded-2xl transition-all duration-200 whitespace-nowrap ${
                          statusTab === tab.id
                            ? (isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42] text-white')
                            : (isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white bg-transparent' : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] bg-transparent')
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
                  className={`relative flex items-center justify-center min-h-[40px] w-[40px] flex-shrink-0 rounded-2xl transition-all duration-200 bg-transparent ${
                    isDark 
                      ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' 
                      : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
                  }`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {(searchId || searchPhone || searchAddress || statusFilter || cityFilter) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
            {/* место под фиксированную панель, чтобы список не уезжал под неё */}
            <div className="mb-4 h-16 w-full shrink-0" aria-hidden />
            </>
            )}

            {/* Ошибка */}
            {!loading && error && (
              <NetworkError
                isDark={isDark}
                onRetry={loadOrders}
                message={error !== 'Ошибка загрузки заказов' ? error : undefined}
              />
            )}

            {/* Состояние загрузки: по центру между шапкой и нижним доком (моб.) */}
            {loading && (
              <div
                className="flex w-full flex-col items-center justify-center min-h-[max(300px,calc(100dvh-10rem-env(safe-area-inset-bottom,0px)))] md:min-h-[min(560px,calc(100dvh-4rem))]"
              >
                <AppLoadingBlock className="animate-fade-in" />
              </div>
            )}

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
                <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
                  showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
                } ${
                  isDark
                    ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                    : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
                }`}>
                  {/* Заголовок панели - только на десктопе */}
                  <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                      title="Скрыть фильтры"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка скрыть - только на мобильных */}
                  <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${
                        isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'
                      }`}
                    >
                      Скрыть фильтры
                    </button>
                  </div>

                  {/* Содержимое фильтров */}
                  <div className="p-6 space-y-8">
                    {/* Секция: Поиск */}
                    <div className="space-y-4">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/55'}`}>Поиск</h3>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={draftSearchId}
                          onChange={(e) => setDraftSearchId(e.target.value)}
                          placeholder="№ заказа..."
                          className={`w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0a4f42]/18 focus:ring-offset-0 dark:focus:ring-white/20 transition-all shadow-sm ${
                            isDark 
                              ? 'bg-white/[0.04] text-white placeholder-white/30'
                              : 'border border-[#cfd2d8] bg-white text-[#111113] placeholder:text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.06)] focus:border-[#0a4f42]/45 focus:ring-[#0a4f42]/18'
                          }`}
                        />
                        <input
                          type="text"
                          value={draftSearchPhone}
                          onChange={(e) => setDraftSearchPhone(e.target.value)}
                          placeholder="Номер телефона..."
                          className={`w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0a4f42]/18 focus:ring-offset-0 dark:focus:ring-white/20 transition-all shadow-sm ${
                            isDark 
                              ? 'bg-white/[0.04] text-white placeholder-white/30'
                              : 'border border-[#cfd2d8] bg-white text-[#111113] placeholder:text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.06)] focus:border-[#0a4f42]/45 focus:ring-[#0a4f42]/18'
                          }`}
                        />
                        <input
                          type="text"
                          value={draftSearchAddress}
                          onChange={(e) => setDraftSearchAddress(e.target.value)}
                          placeholder="Адрес..."
                          className={`w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0a4f42]/18 focus:ring-offset-0 dark:focus:ring-white/20 transition-all shadow-sm ${
                            isDark 
                              ? 'bg-white/[0.04] text-white placeholder-white/30'
                              : 'border border-[#cfd2d8] bg-white text-[#111113] placeholder:text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.06)] focus:border-[#0a4f42]/45 focus:ring-[#0a4f42]/18'
                          }`}
                        />
                      </div>
                    </div>

                    <hr className={isDark ? 'border-white/10' : 'border-black/[0.06]'} />

                    {/* Секция: Основные фильтры */}
                    <div className="space-y-4">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/55'}`}>Основные</h3>
                      <div className="space-y-3">
                        <Select value={draftStatusFilter || "all"} onValueChange={(value) => setDraftStatusFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full min-h-[44px] px-4 rounded-2xl text-[15px] shadow-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-2 data-[state=open]:ring-offset-0 ${
                            isDark
                              ? 'bg-white/[0.04] text-white border-white/15 focus:!border-white/30 focus:!ring-[rgba(255,255,255,0.2)] data-[state=open]:!border-white/30 data-[state=open]:!ring-[rgba(255,255,255,0.2)]'
                              : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] data-[state=open]:border-[rgba(10,79,66,0.55)] data-[state=open]:ring-[rgba(10,79,66,0.22)] focus:border-[#0a4f42]/45 focus:ring-[#0a4f42]/18'
                          }`}>
                            <SelectValue placeholder="Все статусы" />
                          </SelectTrigger>
                          <SelectContent className={`rounded-2xl border-0 shadow-xl ${isDark ? 'bg-[#1e1e20]' : 'bg-white'}`}>
                            <SelectItem value="all" className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>Все статусы</SelectItem>
                            {allStatuses.map(status => (
                              <SelectItem key={status} value={status} className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full min-h-[44px] px-4 rounded-2xl text-[15px] shadow-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-2 data-[state=open]:ring-offset-0 ${
                            isDark
                              ? 'bg-white/[0.04] text-white border-white/15 focus:!border-white/30 focus:!ring-[rgba(255,255,255,0.2)] data-[state=open]:!border-white/30 data-[state=open]:!ring-[rgba(255,255,255,0.2)]'
                              : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] data-[state=open]:border-[rgba(10,79,66,0.55)] data-[state=open]:ring-[rgba(10,79,66,0.22)] focus:border-[#0a4f42]/45 focus:ring-[#0a4f42]/18'
                          }`}>
                            <SelectValue placeholder="Все города" />
                          </SelectTrigger>
                          <SelectContent className={`rounded-2xl border-0 shadow-xl ${isDark ? 'bg-[#1e1e20]' : 'bg-white'}`}>
                            <SelectItem value="all" className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>Все города</SelectItem>
                            {uniqueCities.map(city => (
                              <SelectItem key={city} value={city} className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Нижняя панель с кнопками */}
                  <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                        isDark 
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
                          : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                      }`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${
                        isDark ? 'bg-white hover:bg-gray-200 text-[#111113]' : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'
                      }`}
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
              <table className={`w-full border-collapse text-xs rounded-[20px] shadow-lg ${
                isDark ? 'bg-white/[0.03]' : 'bg-white'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
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
                          ? 'border-white/10 hover:bg-white/[0.04]'
                          : 'border-black/10 hover:bg-black/[0.02]'
                      }`}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className={`py-2 px-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.id}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.rk?.name || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.city?.name || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.avito?.name || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.phone}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.clientName}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.address}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{formatDate(order.dateMeeting)}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.equipmentType?.name || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.comment || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.status?.name || '')}`}>
                          {order.status?.name || '-'}
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
                      ? 'bg-white/[0.03] border-white/10 hover:border-white/25'
                      : 'bg-white border-black/10 hover:border-black/30'
                  }`}
                  onClick={() => handleOrderClick(order.id)}
                >
                  {/* Верхняя строка: ID, тип, дата */}
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${
                    isDark ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.02] border-black/10'
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
                    
                    <div className="flex items-start gap-1.5 mb-2">
                      <span className={`text-xs shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{order.equipmentType?.name || '—'}</span>
                      {order.comment && (
                        <>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>·</span>
                          <span className={`text-xs line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.comment}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Нижняя строка: мастер, статус, сумма */}
                  <div className={`flex items-center justify-between px-3 py-2 border-t ${
                    isDark ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.02] border-black/10'
                  }`}>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.master?.name || 'Не назначен'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.status?.name || '')}`}>
                        {order.status?.name || '-'}
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
    <Suspense fallback={<LoadingScreen embeddedInLayout />}>
      <OrdersContent />
    </Suspense>
  )
}
