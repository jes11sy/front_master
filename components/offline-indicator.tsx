'use client'

import { WifiOff, Wifi, CloudOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus()

  // Всегда показываем индикатор в оффлайн режиме
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-all duration-300 bg-orange-600 text-white">
        <div className="flex items-center justify-center gap-2">
          <CloudOff className="h-4 w-4" />
          <span>Оффлайн режим. Изменения будут синхронизированы при подключении</span>
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

