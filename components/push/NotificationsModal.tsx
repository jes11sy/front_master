'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, X, Check, FileText, Info } from 'lucide-react'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const router = useRouter()
  const { theme } = useDesignStore()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  // Закрываем модалку по ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Блокируем скролл body при открытой модалке
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    return `${diffDays} дн назад`
  }

  // Иконка для типа уведомления
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'master_assigned':
      case 'master_order_rescheduled':
      case 'master_order_rejected':
      case 'master_order_reassigned':
        return FileText
      default:
        return Info
    }
  }

  // Обработка клика на уведомление
  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    // Отмечаем как прочитанное
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    
    // Переходим на страницу заказа
    if (notification.orderId) {
      router.push(`/orders/${notification.orderId}`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md mx-4 rounded-lg shadow-2xl ${
          theme === 'dark' ? 'bg-[#252d3a] border border-gray-700' : 'bg-white border border-gray-200'
        } max-h-[80vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            <h2 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              Уведомления
            </h2>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#0d5c4b] hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Прочитать все
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1 rounded transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className={`px-6 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d5c4b] mx-auto mb-3"></div>
              <p className="text-sm">Загрузка...</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-6 py-4 border-b cursor-pointer transition-colors ${
                    theme === 'dark' 
                      ? 'border-gray-700 hover:bg-gray-700/50' 
                      : 'border-gray-100 hover:bg-gray-50'
                  } ${
                    !notification.read 
                      ? theme === 'dark' ? 'bg-[#0d5c4b]/10' : 'bg-[#0d5c4b]/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-0.5 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        notification.read 
                          ? theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          : theme === 'dark' ? 'text-gray-100 font-medium' : 'text-gray-900 font-medium'
                      }`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-[#0d5c4b] rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className={`px-6 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Нет уведомлений</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
