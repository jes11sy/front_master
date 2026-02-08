'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import apiClient from '@/lib/api'
import { Loader2, Filter, X, Download } from 'lucide-react'

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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        <div className="max-w-4xl">
          
          {/* Фильтры */}
          <div className="mb-6">
            <div className="flex items-center justify-end mb-4">
              {/* Кнопка фильтров */}
              <button
                onClick={openFilterDrawer}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  isDark 
                    ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-400 hover:text-teal-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'
                }`}
                title="Фильтры"
              >
                <Filter className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#1e2530]' : 'border-white'}`} />
                )}
              </button>
            </div>

            {/* Активные фильтры как теги */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {startDate && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    isDark ? 'bg-[#0d5c4b]/20 text-[#0d5c4b] border-[#0d5c4b]/30' : 'bg-[#daece2] text-[#0d5c4b] border-[#0d5c4b]/20'
                  }`}>
                    От: {new Date(startDate).toLocaleDateString('ru-RU')}
                    <button 
                      onClick={() => { setStartDate(''); loadStatistics({ endDate: endDate || undefined }) }} 
                      className="ml-1 hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                )}
                {endDate && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    isDark ? 'bg-[#0d5c4b]/20 text-[#0d5c4b] border-[#0d5c4b]/30' : 'bg-[#daece2] text-[#0d5c4b] border-[#0d5c4b]/20'
                  }`}>
                    До: {new Date(endDate).toLocaleDateString('ru-RU')}
                    <button 
                      onClick={() => { setEndDate(''); loadStatistics({ startDate: startDate || undefined }) }} 
                      className="ml-1 hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Drawer для фильтров */}
          {showFilterDrawer && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
                onClick={() => setShowFilterDrawer(false)}
              />
              
              {/* Drawer */}
              <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
                isDark ? 'bg-[#2a3441]' : 'bg-white'
              }`}>
                {/* Header */}
                <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ${
                  isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Секция: Период */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Период
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {quickPeriods.map((period) => (
                        <button
                          key={period.label}
                          onClick={() => {
                            const { start, end } = period.getValue()
                            setDraftStartDate(start)
                            setDraftEndDate(end)
                          }}
                          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                            isDark 
                              ? 'bg-[#3a4451] hover:bg-[#0d5c4b]/20 border-gray-600 hover:border-[#0d5c4b] text-gray-300 hover:text-[#0d5c4b]' 
                              : 'bg-gray-50 hover:bg-[#daece2] border-gray-200 hover:border-[#0d5c4b] text-gray-700 hover:text-[#0d5c4b]'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                        <input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                            isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                        <input
                          type="date"
                          value={draftEndDate}
                          onChange={(e) => setDraftEndDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                            isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${
                  isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <button
                    onClick={resetFilters}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Применить
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Состояние загрузки */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className={`h-8 w-8 animate-spin mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Загрузка статистики...</p>
            </div>
          )}

          {/* Ошибка */}
          {error && !loading && (
            <div className="text-center py-16">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={() => loadStatistics({ startDate, endDate })}
                className="px-4 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* Таблица статистики */}
          {!loading && !error && (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className={`w-full text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'border-[#0d5c4b]/50' : 'border-[#0d5c4b]/30'}`}>
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
                            ? isDark ? 'bg-[#0d5c4b]/20 border-[#0d5c4b]/30' : 'bg-[#daece2] border-[#0d5c4b]/20'
                            : isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <td className={`py-3 px-4 ${isTotal ? 'font-bold' : 'font-medium'} ${
                          isTotal 
                            ? isDark ? 'text-[#0d5c4b]' : 'text-[#0d5c4b]'
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
                          isDark ? 'text-[#0d5c4b]' : 'text-[#0d5c4b]'
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
