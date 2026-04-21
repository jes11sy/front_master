'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import apiClient from '@/lib/api'
import { NetworkError } from '@/components/ui/network-error'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { AppLoadingBlock } from '@/components/ui/loading-screen'

// Интерфейс статистики
interface CityStatistics {
  city: string
  closedOrders: number
  modernOrders: number
  totalRevenue: number
  averageCheck: number
  salary: number
}

export default function StatisticsPage() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [cityStatistics, setCityStatistics] = useState<CityStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Фильтры
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)

  // Быстрые периоды
  const quickPeriods = [
    { label: 'Сегодня', getValue: () => {
      const today = new Date().toISOString().split('T')[0]
      return { start: today, end: today }
    }},
    { label: 'Вчера', getValue: () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      return { start: yesterday, end: yesterday }
    }},
    { label: 'Неделя', getValue: () => {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      return { start, end }
    }},
    { label: 'Тек. месяц', getValue: () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const start = firstDay.toISOString().split('T')[0]
      const end = now.toISOString().split('T')[0]
      return { start, end }
    }},
  ]

  // Подсчёт активных фильтров
  const activeFiltersCount = [startDate, endDate].filter(Boolean).length

  // Загрузка статистики
  const loadStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.getMasterStatistics({
        startDate: filters?.startDate || undefined,
        endDate: filters?.endDate || undefined
      })
      
      if (response.success && response.data) {
        setCityStatistics(response.data)
      } else {
        setError(response.error || 'Ошибка загрузки статистики')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка загрузки статистики')
      if (error.message?.includes('401') || error.message?.includes('токен')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // При загрузке устанавливаем фильтр по текущему месяцу (с 1-го числа по сегодня)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const startDateStr = firstDay.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]
    
    setStartDate(startDateStr)
    setEndDate(endDateStr)
    setDraftStartDate(startDateStr)
    setDraftEndDate(endDateStr)
    loadStatistics({ startDate: startDateStr, endDate: endDateStr })
  }, [])

  // Открытие drawer
  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setShowFilterDrawer(true)
  }

  // Сброс черновых фильтров
  const resetFilters = () => {
    setDraftStartDate('')
    setDraftEndDate('')
  }

  // Применить фильтры
  const applyFilters = () => {
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setShowFilterDrawer(false)
    loadStatistics({ startDate: draftStartDate, endDate: draftEndDate })
  }

  // Сброс всех фильтров
  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    loadStatistics()
  }

  // Форматирование чисел
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className={`px-4 ${loading ? 'py-0' : 'py-6'}`}>
        <div className="w-full">
          
          {/* Кнопка фильтров — скрыта на время загрузки */}
          {!loading && (
          <div className="mb-4 animate-slide-in-left">
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={openFilterDrawer}
                className={`relative flex items-center justify-center min-h-[40px] w-[40px] rounded-2xl transition-all duration-200 bg-transparent ${
                  isDark 
                    ? 'text-white/92 hover:bg-white/[0.04] hover:text-white'
                    : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
                }`}
                title="Фильтры"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFiltersCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full" />
                )}
              </button>
            </div>
          </div>
          )}

          {/* Sidebar Drawer для фильтров */}
          {showFilterDrawer && (
            <>
              {/* Overlay */}
              <div 
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                  isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'
                }`}
                onClick={() => setShowFilterDrawer(false)}
              />
              
              {/* Drawer */}
              <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
                isDark
                  ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                  : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
              }`}>
                {/* Header desktop */}
                <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
                  isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    title="Скрыть фильтры"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>

                {/* Header mobile */}
                <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                  isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${
                      isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'
                    }`}
                  >
                    Скрыть фильтры
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                  {/* Секция: Период */}
                  <div className="space-y-4">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/55'}`}>
                      Период
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {quickPeriods.map((period) => (
                        (() => {
                          const { start, end } = period.getValue()
                          const isActive = draftStartDate === start && draftEndDate === end

                          return (
                            <button
                              key={period.label}
                              onClick={() => {
                                if (isActive) {
                                  setDraftStartDate('')
                                  setDraftEndDate('')
                                  return
                                }
                                setDraftStartDate(start)
                                setDraftEndDate(end)
                              }}
                              className={`px-3 py-2 border rounded-xl text-sm font-medium transition-all duration-200 ${
                                isActive
                                  ? (isDark
                                      ? 'bg-white text-[#111113] border-white'
                                      : 'bg-[#0a4f42] text-white border-[#0a4f42]')
                                  : (isDark
                                      ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 text-white/85 hover:text-white'
                                      : 'bg-white hover:bg-[#f3f4f6] border-[#cfd2d8] text-[#111113]')
                              }`}
                            >
                              {period.label}
                            </button>
                          )
                        })()
                      ))}
                    </div>
                    
                    <DateRangePicker
                      startDate={draftStartDate}
                      endDate={draftEndDate}
                      onChange={(start, end) => {
                        setDraftStartDate(start)
                        setDraftEndDate(end)
                      }}
                      isDark={isDark}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                  isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={resetFilters}
                    className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                      isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                    }`}
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={applyFilters}
                    className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                      isDark ? 'bg-white hover:bg-gray-200 text-[#111113]' : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'
                    }`}
                  >
                    Применить
                  </button>
                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="flex w-full flex-col items-center justify-center min-h-[max(300px,calc(100dvh-10rem-env(safe-area-inset-bottom,0px)))] md:min-h-[min(560px,calc(100dvh-4rem))]">
              <AppLoadingBlock className="animate-fade-in" />
            </div>
          )}

          {/* Ошибка */}
          {error && !loading && (
            <NetworkError
              isDark={isDark}
              onRetry={() => loadStatistics({ startDate, endDate })}
              message={error !== 'Ошибка загрузки статистики' ? error : undefined}
            />
          )}

          {/* Таблица статистики */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse text-sm rounded-[20px] shadow-lg ${isDark ? 'bg-white/[0.03] text-gray-200' : 'bg-white text-gray-700'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Город</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Закрыто</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Модерны</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Оборот</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Ср. чек</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Зарплата</th>
                  </tr>
                </thead>
                <tbody>
                  {cityStatistics.map((stat, index) => {
                    const isTotal = stat.city === 'ИТОГО'
                    return (
                      <tr 
                        key={index} 
                        className={`border-b transition-colors ${
                          isTotal 
                            ? isDark ? 'bg-white/[0.08] border-white/20' : 'bg-[#e8f2ef] border-[#0a4f42]/20'
                            : isDark ? 'border-white/10 hover:bg-white/[0.04]' : 'border-black/10 hover:bg-black/[0.02]'
                        }`}
                      >
                        <td className={`py-3 px-4 ${isTotal ? 'font-bold' : 'font-medium'} ${
                          isTotal 
                            ? isDark ? 'text-white' : 'text-[#0a4f42]'
                            : isDark ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          {stat.city}
                        </td>
                        <td className={`py-3 px-4 text-right ${isTotal ? 'font-bold' : ''}`}>
                          {stat.closedOrders}
                        </td>
                        <td className={`py-3 px-4 text-right ${isTotal ? 'font-bold' : ''}`}>
                          {stat.modernOrders}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          isDark ? 'text-white' : 'text-[#0a4f42]'
                        }`}>
                          {formatNumber(stat.totalRevenue)} ₽
                        </td>
                        <td className={`py-3 px-4 text-right ${isTotal ? 'font-bold' : ''}`}>
                          {formatNumber(stat.averageCheck)} ₽
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          isDark ? 'text-amber-400' : 'text-amber-600'
                        }`}>
                          {formatNumber(stat.salary)} ₽
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Пустое состояние */}
              {cityStatistics.length === 0 && (
                <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Нет данных для отображения
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
