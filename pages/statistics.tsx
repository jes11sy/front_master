import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Убрали все иконки из lucide-react
import apiClient from '@/lib/api'
import { useRouter } from 'next/router'

// Интерфейс статистики
interface CityStatistics {
  city: string
  closedOrders: number
  modernOrders: number
  totalRevenue: number
  averageCheck: number
  salary: number
}


const Statistics: NextPage = () => {
  const router = useRouter()
  const [period, setPeriod] = useState('custom')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [cityStatistics, setCityStatistics] = useState<CityStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Загружаем статистику из API
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        console.log('Загружаем статистику мастера...')
        const response = await apiClient.getMasterStatistics({
          startDate: startDate || undefined,
          endDate: endDate || undefined
        })
        
        console.log('Ответ API статистики:', response)
        
        if (response.success && response.data) {
          console.log('Статистика загружена:', response.data.length, 'городов')
          setCityStatistics(response.data)
        } else {
          console.error('Ошибка загрузки статистики:', response.error)
          setError(response.error || 'Ошибка загрузки статистики')
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке статистики:', error)
        setError(error.message || 'Ошибка загрузки статистики')
        // Если ошибка авторизации, перенаправляем на логин
        if (error.message?.includes('401') || error.message?.includes('токен')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [startDate, endDate, router])

  const handlePeriodChange = (value: string) => {
    // Если нажали на уже активную кнопку - сбрасываем фильтр
    if (period === value) {
      // Для "Произвольный" не сбрасываем, а просто оставляем как есть
      if (value !== 'custom') {
        setPeriod('custom')
        setStartDate('')
        setEndDate('')
      }
      return
    }
    
    setPeriod(value)
    const today = new Date()
    
    // Функция для форматирования дат в локальном часовом поясе
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    switch (value) {
      case 'day':
        // Текущий день
        const todayStr = formatDate(today)
        setStartDate(todayStr)
        setEndDate(todayStr)
        break
      case 'week':
        // Неделя с понедельника по воскресенье
        const weekStart = new Date(today)
        // Получаем понедельник текущей недели
        const dayOfWeek = today.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        weekStart.setDate(today.getDate() + daysToMonday)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Воскресенье
        
        setStartDate(formatDate(weekStart))
        setEndDate(formatDate(weekEnd))
        break
      case 'month':
        // Месяц с 1 числа по последнее число текущего месяца
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        
        setStartDate(formatDate(monthStart))
        setEndDate(formatDate(monthEnd))
        break
      case 'custom':
        setStartDate('')
        setEndDate('')
        break
    }
  }


  return (
    <>
      <Head>
        <title>Статистика - Новые Схемы</title>
        <meta name="description" content="Аналитика и статистика Новые Схемы" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
          <div className="max-w-none mx-auto">
          {/* Statistics Table with Filter */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Статистика</h2>
              
              {/* Date Filter */}
              <div className="mb-6">
                <button
                  onClick={() => setIsFilterVisible(!isFilterVisible)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h3 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200 ${
                      isFilterVisible ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isFilterVisible && (
                  <div className="relative z-50 space-y-4 animate-slide-in-right mt-4">
                    {/* Period Selection */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { value: 'day', label: 'День' },
                        { value: 'week', label: 'Неделя' },
                        { value: 'month', label: 'Месяц' },
                        { value: 'custom', label: 'Произвольный' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handlePeriodChange(option.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-center ${
                            period === option.value
                              ? 'bg-teal-600 text-white border border-teal-500 shadow-lg shadow-teal-500/25'
                              : 'bg-gray-100 text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Date Range Selection */}
                    {period === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="startDate" className="text-gray-700 text-xs">Дата начала</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-white border-gray-300 text-gray-800 focus:border-teal-500 text-sm h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="endDate" className="text-gray-700 text-xs">Дата окончания</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-white border-gray-300 text-gray-800 focus:border-teal-500 text-sm h-9"
                          />
                        </div>
                      </div>
                    )}

                    {/* Selected Period Display */}
                    {period !== 'custom' && (startDate || endDate) && (
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-300">
                        <span className="text-xs text-gray-700">
                          Период: {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Загрузка статистики...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-red-600">{error}</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-3 px-4 text-gray-700 font-medium">Город</th>
                        <th className="text-right py-3 px-4 text-gray-700 font-medium">Закрытые заказы</th>
                        <th className="text-right py-3 px-4 text-gray-700 font-medium">Модерны</th>
                        <th className="text-right py-3 px-4 text-gray-700 font-medium">Оборот</th>
                        <th className="text-right py-3 px-4 text-gray-700 font-medium">Средний чек</th>
                        <th className="text-right py-3 px-4 text-gray-700 font-medium">Зарплата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cityStatistics.map((stat, index) => (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-200 ${
                            stat.city === 'ИТОГО' 
                              ? 'bg-teal-50 font-semibold' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-teal-800 font-bold' 
                                : 'text-gray-800'
                            }`}>
                              {stat.city}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-teal-800 font-bold' 
                                : 'text-gray-600'
                            }`}>
                              {stat.closedOrders}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-teal-800 font-bold' 
                                : 'text-gray-600'
                            }`}>
                              {stat.modernOrders}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-teal-800 font-bold' 
                                : 'text-gray-600'
                            }`}>
                              {stat.totalRevenue.toLocaleString('ru-RU')} ₽
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-teal-800 font-bold' 
                                : 'text-gray-600'
                            }`}>
                              {stat.averageCheck.toLocaleString('ru-RU')} ₽
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-teal-800 font-bold' 
                                : 'text-gray-600'
                            }`}>
                              {stat.salary.toLocaleString('ru-RU')} ₽
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Statistics
