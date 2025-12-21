'use client'

import { WifiOff, Wifi, CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Реальная проверка связи (для iOS PWA, где navigator.onLine может врать)
    const checkRealConnection = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        // Проверяем доступность API
        await fetch('https://api.lead-schem.ru/api/auth/profile', { 
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include'
        })
        
        clearTimeout(timeoutId)
        setIsOnline(true)
      } catch {
        // Любая ошибка = оффлайн (включая таймаут, network error, 401)
        setIsOnline(false)
      }
    }

    // Начальная проверка
    checkRealConnection()

    // Периодическая проверка каждые 10 секунд
    const interval = setInterval(checkRealConnection, 10000)

    const handleOnline = () => {
      checkRealConnection()
      setWasOffline(true)
      setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Всегда показываем индикатор в оффлайн режиме
  if (!isOnline) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 py-3 px-4 text-center text-sm font-medium transition-all duration-300 bg-orange-600 text-white shadow-lg"
        style={{ zIndex: 9999 }}
      >
        <div className="flex items-center justify-center gap-2">
          <CloudOff className="h-5 w-5" />
          <span className="font-semibold">ОФФЛАЙН РЕЖИМ</span>
        </div>
      </div>
    )
  }

  // Показываем зеленый индикатор на 3 секунды после восстановления соединения
  if (wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-all duration-300 bg-green-600 text-white">
        <div className="flex items-center justify-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>Соединение восстановлено. Синхронизация...</span>
        </div>
      </div>
    )
  }

  // Онлайн и не было оффлайна - не показываем
  return null
}

