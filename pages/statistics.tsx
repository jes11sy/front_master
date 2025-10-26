import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, DollarSign, Calculator, Wallet, Calendar, Filter, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react'
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
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
        <div className="max-w-7xl mx-auto p-6 pt-4 md:pt-6 space-y-6">
          {/* Date Filter */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <CardTitle className="text-white text-sm">Фильтр</CardTitle>
                </div>
                <Button
                  onClick={() => setIsFilterVisible(!isFilterVisible)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
                >
                  {isFilterVisible ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </CardHeader>
            {isFilterVisible && (
              <CardContent>
                <div className="space-y-4">
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
                            ? 'bg-green-600 text-white border border-green-500 shadow-lg shadow-green-500/25'
                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Date Range Selection */}
                  {period === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-800/30 rounded-lg">
                      <div className="space-y-1">
                        <Label htmlFor="startDate" className="text-gray-300 text-xs">Дата начала</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-gray-800/50 border-gray-600 text-white focus:border-gray-500 text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="endDate" className="text-gray-300 text-xs">Дата окончания</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-gray-800/50 border-gray-600 text-white focus:border-gray-500 text-sm h-9"
                        />
                      </div>
                    </div>
                  )}

                  {/* Selected Period Display */}
                  {period !== 'custom' && (startDate || endDate) && (
                    <div className="flex items-center space-x-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-300">
                        Период: {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Statistics Table */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                  <span className="ml-2 text-gray-300">Загрузка статистики...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <span className="ml-2 text-red-300">{error}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Город</th>
                        <th className="text-right py-3 px-4 text-gray-300 font-medium">Закрытые заказы</th>
                        <th className="text-right py-3 px-4 text-gray-300 font-medium">Модерны</th>
                        <th className="text-right py-3 px-4 text-gray-300 font-medium">Оборот</th>
                        <th className="text-right py-3 px-4 text-gray-300 font-medium">Средний чек</th>
                        <th className="text-right py-3 px-4 text-gray-300 font-medium">Зарплата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cityStatistics.map((stat, index) => (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-800/50 ${
                            stat.city === 'ИТОГО' 
                              ? 'bg-gray-800/30 font-semibold' 
                              : 'hover:bg-gray-800/20'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-white font-bold' 
                                : 'text-white'
                            }`}>
                              {stat.city}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-white font-bold' 
                                : 'text-gray-300'
                            }`}>
                              {stat.closedOrders}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-white font-bold' 
                                : 'text-gray-300'
                            }`}>
                              {stat.modernOrders}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-white font-bold' 
                                : 'text-gray-300'
                            }`}>
                              {stat.totalRevenue.toLocaleString('ru-RU')} ₽
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-white font-bold' 
                                : 'text-gray-300'
                            }`}>
                              {stat.averageCheck.toLocaleString('ru-RU')} ₽
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`${
                              stat.city === 'ИТОГО' 
                                ? 'text-white font-bold' 
                                : 'text-gray-300'
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
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  )
}

export default Statistics
