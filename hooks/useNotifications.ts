import { useState, useEffect, useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

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
      
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load notifications: ${response.status}`)
      }

      const result = await response.json()
      
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
      const response = await fetch(`${API_URL}/notifications/read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
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
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        body: '{}',
      })

      if (response.ok) {
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
      const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
      })

      if (response.ok) {
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
