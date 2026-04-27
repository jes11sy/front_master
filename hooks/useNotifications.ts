import { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  orderId?: number
  data?: Record<string, any>
  read: boolean
  createdAt: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка уведомлений
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await apiClient.getNotifications()

      if (result.success && result.data) {
        setNotifications(result.data.notifications || [])
        setUnreadCount(result.data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Отметить уведомление как прочитанное
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await apiClient.markNotificationAsRead(notificationId)
      if (response.success) {
        // Обновляем локальный стейт
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  // Отметить все как прочитанные
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await apiClient.markAllNotificationsAsRead()
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }, [])

  // Удалить уведомление
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await apiClient.deleteNotification(notificationId)
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Если было непрочитанным - уменьшаем счётчик
        const wasUnread = notifications.find(n => n.id === notificationId && !n.read)
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }, [notifications])

  // Загружаем при монтировании
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    reload: loadNotifications,
  }
}
