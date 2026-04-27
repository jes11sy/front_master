'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { AppLoadingBlock, LoadingScreen } from '@/components/ui/loading-screen'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { useDesignStore } from '@/store/design.store'
import { NetworkError } from '@/components/ui/network-error'

function ScheduleContent() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDays, setSelectedDays] = useState<{[key: string]: boolean}>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

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
      setLoadError('')
      try {
        const startDate = formatDate(weekDates[0])
        const endDate = formatDate(weekDates[6])
        
        const response = await apiClient.getOwnSchedule({ startDate, endDate })
        
        if (response.success && response.data?.schedule) {
          const scheduleMap: {[key: string]: boolean} = {}
          response.data.schedule.forEach((item: { date: string; isWorkDay: boolean }) => {
            scheduleMap[item.date] = item.isWorkDay
          })
          setSelectedDays(scheduleMap)
        }
      } catch (error) {
        console.error('Ошибка загрузки расписания:', error)
        setLoadError('Не удалось загрузить расписание')
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

  const goToPrevWeek = () => {
    setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  const goToNextWeek = () => {
    setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
    }`}>
      <div className={`px-4 ${isLoading ? 'py-0' : 'py-6'}`}>
        <div className="max-w-2xl mx-auto w-full">

          {isLoading && (
            <div className="flex w-full flex-col items-center justify-center min-h-[max(300px,calc(100dvh-10rem-env(safe-area-inset-bottom,0px)))] md:min-h-[min(560px,calc(100dvh-4rem))]">
              <AppLoadingBlock className="animate-fade-in" />
            </div>
          )}

          {!isLoading && (
          <>
          {/* Навигация по неделям */}
          <div className={`rounded-[20px] p-4 mb-4 border shadow-lg ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevWeek}
                className={`min-h-[40px] min-w-[40px] rounded-2xl transition-all duration-200 flex items-center justify-center ${
                  isDark 
                    ? 'text-white/85 hover:text-white hover:bg-white/[0.08]'
                    : 'text-[#3a3a3c] hover:text-[#111113] hover:bg-black/[0.035]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#111113]'}`}>
                  {currentWeek.toLocaleDateString('ru-RU', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                <p className={`text-xs ${isDark ? 'text-white/65' : 'text-[#66666b]'}`}>
                  {weekDates[0].toLocaleDateString('ru-RU')} - {weekDates[6].toLocaleDateString('ru-RU')}
                </p>
              </div>
              
              <button
                onClick={goToNextWeek}
                className={`min-h-[40px] min-w-[40px] rounded-2xl transition-all duration-200 flex items-center justify-center ${
                  isDark 
                    ? 'text-white/85 hover:text-white hover:bg-white/[0.08]'
                    : 'text-[#3a3a3c] hover:text-[#111113] hover:bg-black/[0.035]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Выбор дней */}
          <div className={`rounded-[20px] p-4 border shadow-lg ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'
          }`}>
            
            {loadError ? (
              <NetworkError
                isDark={isDark}
                onRetry={() => setCurrentWeek(new Date(currentWeek))}
                message={loadError}
              />
            ) : (
              <>
                {/* Сетка дней */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {weekDates.map((date, index) => {
                    const dateStr = formatDate(date)
                    const dayValue = selectedDays[dateStr]
                    const isWorkDay = dayValue === true
                    const isDayOff = dayValue === false
                    const isToday = formatDate(new Date()) === dateStr
                    
                    return (
                      <div key={index} className="text-center">
                        <div className={`text-xs mb-1 font-medium ${
                          isDark ? 'text-white/65' : 'text-[#66666b]'
                        }`}>
                          {dayNames[index]}
                        </div>
                        <button
                          onClick={() => handleDayToggle(date)}
                          className={`w-full aspect-square rounded-2xl text-sm font-bold transition-all duration-200 relative ${
                            isWorkDay 
                              ? 'bg-[#0a4f42] text-white shadow-md hover:bg-[#083e34]' 
                              : isDayOff
                              ? 'bg-[#b4232c] text-white shadow-md hover:bg-[#911d24]'
                              : isDark
                              ? 'bg-white/[0.06] text-white/85 border border-white/10 hover:bg-white/[0.1]'
                              : 'bg-white text-[#3a3a3c] border border-black/10 hover:bg-black/[0.03]'
                          } ${isToday ? (isDark ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#111113]' : 'ring-2 ring-[#0a4f42]/45 ring-offset-2 ring-offset-[#f5f5f7]') : ''}`}
                        >
                          {date.getDate()}
                        </button>
                      </div>
                    )
                  })}
                </div>
                
                {/* Легенда */}
                <div className="flex flex-wrap gap-4 justify-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#0a4f42] rounded"></div>
                    <span className={`text-xs ${isDark ? 'text-white/85' : 'text-[#3a3a3c]'}`}>Рабочий</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#b4232c] rounded"></div>
                    <span className={`text-xs ${isDark ? 'text-white/85' : 'text-[#3a3a3c]'}`}>Выходной</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-white/[0.1] border border-white/10' : 'bg-black/[0.03] border border-black/15'}`}></div>
                    <span className={`text-xs ${isDark ? 'text-white/85' : 'text-[#3a3a3c]'}`}>Не выбран</span>
                  </div>
                </div>

                {/* Кнопка сохранения */}
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-full min-h-[46px] px-4 rounded-2xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-white text-[#111113] hover:bg-white/90'
                      : 'bg-[#0a4f42] text-white hover:bg-[#083e34]'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить расписание'
                  )}
                </button>
              </>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<LoadingScreen embeddedInLayout />}>
      <ScheduleContent />
    </Suspense>
  )
}
