'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * 🍪 AuthGuard с поддержкой httpOnly cookies
 * Проверяет сессию через API вместо чтения localStorage
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // 🍪 Проверяем сессию через API - токены в httpOnly cookies
    const checkAuth = async () => {
      try {
        // Пытаемся получить профиль - если cookies валидны, получим данные
        const response = await apiClient.getProfile()
        
        if (response.success && response.data) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          router.push('/login')
        }
      } catch (error) {
        // Если ошибка (включая 401) - перенаправляем на логин
        setIsAuthenticated(false)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  // Показываем loading состояние пока проверяем сессию
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Если не аутентифицирован, не показываем содержимое
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
