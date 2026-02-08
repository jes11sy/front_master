'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'
import { logger } from '@/lib/logger'
import { LoadingScreen } from '@/components/ui/loading-screen'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * 🍪 AuthGuard с поддержкой httpOnly cookies
 * Проверяет сессию через API вместо чтения localStorage
 * При неудаче пробует восстановить через IndexedDB (iOS PWA backup)
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter()
  // Начальное состояние всегда null для избежания hydration mismatch
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  // Флаг для отслеживания оптимистичной загрузки (проверка localStorage)
  const [hasOptimisticCheck, setHasOptimisticCheck] = useState(false)

  // Оптимистичная проверка localStorage - только на клиенте
  useEffect(() => {
    if (!hasOptimisticCheck) {
      const savedUser = apiClient.getSavedUser()
      if (savedUser) {
        setIsAuthenticated(true)
      }
      setHasOptimisticCheck(true)
    }
  }, [hasOptimisticCheck])

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await apiClient.getProfile()
        
        if (!isMounted) return
        
        if (response.success && response.data) {
          setIsAuthenticated(true)
        } else {
          // Cookies не работают — пробуем восстановить через IndexedDB
          logger.debug('Cookies invalid, trying to restore from IndexedDB')
          const restored = await apiClient.restoreSessionFromIndexedDB()
          
          if (!isMounted) return
          
          if (restored) {
            logger.debug('Session restored from IndexedDB')
            setIsAuthenticated(true)
          } else {
            setIsAuthenticated(false)
            apiClient.clearToken()
            router.replace('/login')
          }
        }
      } catch {
        if (!isMounted) return
        
        // Пробуем восстановить через IndexedDB
        logger.debug('Auth check failed, trying IndexedDB restore')
        const restored = await apiClient.restoreSessionFromIndexedDB()
        
        if (!isMounted) return
        
        if (restored) {
          logger.debug('Session restored from IndexedDB')
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          apiClient.clearToken()
          router.replace('/login')
        }
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  // Показываем loading только если нет сохранённого пользователя
  if (isAuthenticated === null) {
    return <LoadingScreen message="Проверка авторизации" />
  }

  // Если не аутентифицирован, не показываем содержимое
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
