'use client'

import { WifiOff, Wifi, CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Определяем, мобильное ли устройство
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isAndroid = userAgent.includes('android')
      const isIOS = /iphone|ipad|ipod/.test(userAgent)
      setIsMobile(isAndroid || isIOS)
    }
    
    checkIfMobile()
  }, [])

  useEffect(() => {
    // Только для мобильных устройств
    if (!isMobile) {
      return
    }

    let retryInterval: NodeJS.Timeout | null = null

    // Проверка связи с сервером
    const checkRealConnection = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        await fetch('https://api.lead-schem.ru/api/auth/profile', { 
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include'
        })
        
        clearTimeout(timeoutId)
        
        // ✅ Связь восстановлена!
        if (!isOnline) {
          console.log('[OfflineIndicator] Connection restored')
          setWasOffline(true)
          setTimeout(() => setWasOffline(false), 3000)
        }
        
        setIsOnline(true)
        
        // 🛑 Останавливаем retry polling, если он был запущен
        if (retryInterval) {
          clearInterval(retryInterval)
          retryInterval = null
          console.log('[OfflineIndicator] Stopped retry polling - connection is back')
        }
      } catch {
        // ❌ Связь потеряна!
        console.log('[OfflineIndicator] Connection lost')
        setIsOnline(false)
        
        // 🔄 Запускаем retry polling (если ещё не запущен)
        if (!retryInterval) {
          console.log('[OfflineIndicator] Starting retry polling every 30 seconds')
          retryInterval = setInterval(checkRealConnection, 30000)
        }
      }
    }

    // Слушаем глобальные события fetch/network errors
    const handleFetchError = () => {
      console.log('[OfflineIndicator] Global fetch error detected')
      checkRealConnection()
    }

    const handleOnline = () => {
      console.log('[OfflineIndicator] Browser reports online')
      checkRealConnection()
    }

    const handleOffline = () => {
      console.log('[OfflineIndicator] Browser reports offline')
      setIsOnline(false)
      // Запускаем retry polling
      if (!retryInterval) {
        retryInterval = setInterval(checkRealConnection, 30000)
      }
    }

    // Подписываемся на события
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Глобальный обработчик ошибок fetch (для перехвата сетевых ошибок)
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('Failed to fetch') || 
          event.reason?.message?.includes('Network request failed')) {
        handleFetchError()
      }
    })

    return () => {
      if (retryInterval) {
        clearInterval(retryInterval)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isMobile, isOnline])

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

