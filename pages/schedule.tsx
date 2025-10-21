import React, { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/navigation'

const Schedule: NextPage = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDays, setSelectedDays] = useState<{[key: string]: 'work' | 'dayoff'}>({})

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

  const handleDayToggle = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDays(prev => ({
      ...prev,
      [dateStr]: prev[dateStr] === 'work' ? 'dayoff' : 'work'
    }))
  }

  return (
    <>
      <Head>
        <title>Расписание - Новые Схемы</title>
        <meta name="description" content="Управление расписанием мастера" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
        <Navigation />
        <div className="max-w-7xl mx-auto p-4 md:p-6 pt-20 md:pt-24 space-y-6">

          {/* Week Navigation */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  ← Предыдущая
                </Button>
                
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">
                    {currentWeek.toLocaleDateString('ru-RU', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {weekDates[0].toLocaleDateString('ru-RU')} - {weekDates[6].toLocaleDateString('ru-RU')}
                  </p>
                </div>
                
                <Button
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  Следующая →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Week Schedule Selection */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Выбор рабочих дней</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-3">
                {weekDates.map((date, index) => {
                  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                  const dateStr = date.toISOString().split('T')[0]
                  const isSelected = selectedDays[dateStr] === 'work'
                  const isDayOff = selectedDays[dateStr] === 'dayoff'
                  
                  return (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-400 mb-1">{dayNames[index]}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDayToggle(date)}
                        className={`w-full h-12 text-xs ${
                          isSelected 
                            ? 'bg-green-500 border-green-400 text-white hover:bg-green-600' 
                            : isDayOff
                            ? 'bg-red-500 border-red-400 text-white hover:bg-red-600'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
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
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-300">Рабочий день</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-300">Выходной</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800 border border-gray-600 rounded"></div>
                  <span className="text-sm text-gray-300">Не выбран</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-4 sm:mt-6 text-center">
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => {
                    console.log('Сохранение расписания:', selectedDays)
                  }}
                >
                  Сохранить расписание
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  )
}

export default Schedule