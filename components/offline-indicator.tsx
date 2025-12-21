'use client'

import { WifiOff, Wifi, CloudOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus()

  if (isOnline && !wasOffline) {
    return null // Онлайн и не было оффлайна - ничего не показываем
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-orange-600 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Соединение восстановлено. Синхронизация...</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            <span>Оффлайн режим. Изменения будут синхронизированы при подключении</span>
          </>
        )}
      </div>
    </div>
  )
}

