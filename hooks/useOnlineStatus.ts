'use client'

import { useState, useEffect } from 'react'

/**
 * Хук для определения онлайн/оффлайн статуса
 */
export function useOnlineStatus() {
  // Инициализируем сразу правильным значением, чтобы избежать мерцания
  const [isOnline, setIsOnline] = useState(() => 
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Дополнительно проверяем при монтировании и устанавливаем правильное значение
    const currentStatus = navigator.onLine
    if (currentStatus !== isOnline) {
      setIsOnline(currentStatus)
    }

    const handleOnline = () => {
      console.log('[OnlineStatus] Connection restored')
      setIsOnline(true)
      setWasOffline(true)
      
      // Через 3 секунды сбрасываем флаг wasOffline
      setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      console.log('[OnlineStatus] Connection lost')
      setIsOnline(false)
    }

    // Подписываемся на события
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Отписываемся при размонтировании
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline])

  return { isOnline, wasOffline }
}

