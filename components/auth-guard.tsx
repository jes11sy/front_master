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
  // Оптимистичная проверка: если есть данные в localStorage, считаем что авторизован (пока проверяем API)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      return !!apiClient.getSavedUser()
    }
    return null
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.getProfile()
        
        if (response.success && response.data) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          // Очищаем localStorage, так как сессия невалидна
          apiClient.clearToken()
          router.replace('/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
        apiClient.clearToken()
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router])

  // Показываем loading состояние пока проверяем сессию
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-80 h-80 mx-auto object-contain"
          >
            <source src="/video/loading.mp4" type="video/mp4" />
          </video>
        </div>
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
