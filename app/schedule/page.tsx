'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Loader2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-screen'

export default function SchedulePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDays, setSelectedDays] = useState<{[key: string]: boolean}>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Генерируем даты недели
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Понедельник
    startOfWeek.setDate(diff)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek)
      currentDate.setDate(startOfWeek.getDate() + i)
      dates.push(currentDate)
    }
    return dates
  }

  const weekDates = getWeekDates(currentWeek)

  // Форматирование даты в YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Загрузка расписания при смене недели
  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoading(true)
      try {
        const startDate = formatDate(weekDates[0])
        const endDate = formatDate(weekDates[6])
        
        const response = await apiClient.getOwnSchedule({ startDate, endDate })
        
        if (response.success && response.data?.schedule) {
          const scheduleMap: {[key: string]: boolean} = {}
          response.data.schedule.forEach(item => {
            scheduleMap[item.date] = item.isWorkDay
          })
          setSelectedDays(scheduleMap)
        }
      } catch (error) {
        console.error('Ошибка загрузки расписания:', error)
        toast.error('Не удалось загрузить расписание')
      } finally {
        setIsLoading(false)
      }
    }

    loadSchedule()
  }, [currentWeek])

  const handleDayToggle = (date: Date) => {
    const dateStr = formatDate(date)
    setSelectedDays(prev => {
      const currentValue = prev[dateStr]
      // Цикл: не выбран -> рабочий -> выходной -> не выбран
      if (currentValue === undefined) {
        return { ...prev, [dateStr]: true } // рабочий
      } else if (currentValue === true) {
        return { ...prev, [dateStr]: false } // выходной
      } else {
        const newState = { ...prev }
        delete newState[dateStr] // не выбран
        return newState
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Собираем только дни, которые выбраны (есть в selectedDays)
      const days = Object.entries(selectedDays).map(([date, isWorkDay]) => ({
        date,
        isWorkDay,
      }))

      if (days.length === 0) {
        toast.info('Выберите хотя бы один день')
        setIsSaving(false)
        return
      }

      const response = await apiClient.updateOwnSchedule(days)
      
      if (response.success) {
        toast.success(`Расписание сохранено (${response.data?.updatedDays || days.length} дней)`)
      } else {
        toast.error(response.error || 'Ошибка сохранения')
      }
    } catch (error: any) {
      console.error('Ошибка сохранения расписания:', error)
      toast.error(error.message || 'Не удалось сохранить расписание')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
          <div className="max-w-4xl mx-auto">

          {/* Week Navigation */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in mb-8" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 text-center">Расписание</h2>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                className="bg-teal-500 text-white hover:bg-teal-600"
              >
                ← Предыдущая
              </Button>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {currentWeek.toLocaleDateString('ru-RU', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                <p className="text-sm text-gray-600">
                  {weekDates[0].toLocaleDateString('ru-RU')} - {weekDates[6].toLocaleDateString('ru-RU')}
                </p>
              </div>
              
              <Button
                onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                className="bg-teal-500 text-white hover:bg-teal-600"
              >
                Следующая →
              </Button>
            </div>
          </div>

          {/* Week Schedule Selection */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 text-center">Выбор рабочих дней</h3>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingSpinner size="lg" variant="dark" />
                <div className="text-gray-600 mt-4">Загрузка...</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-3">
                  {weekDates.map((date, index) => {
                    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                    const dateStr = formatDate(date)
                    const dayValue = selectedDays[dateStr]
                    const isWorkDay = dayValue === true
                    const isDayOff = dayValue === false
                    const isNotSelected = dayValue === undefined
                    
                    return (
                      <div key={index} className="text-center">
                        <div className="text-xs text-gray-600 mb-1">{dayNames[index]}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDayToggle(date)}
                          className={`w-full h-12 text-xs ${
                            isWorkDay 
                              ? 'bg-teal-500 border-teal-400 text-white hover:bg-teal-600' 
                              : isDayOff
                              ? 'bg-red-500 border-red-400 text-white hover:bg-red-600'
                              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {date.getDate()}
                        </Button>
                      </div>
                    )
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-teal-500 rounded"></div>
                    <span className="text-sm text-gray-700">Рабочий день</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-700">Выходной</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span className="text-sm text-gray-700">Не выбран</span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-4 sm:mt-6 text-center">
                  <Button 
                    className="bg-teal-500 hover:bg-teal-600 text-white min-w-[200px]"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      'Сохранить расписание'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
  )
}
