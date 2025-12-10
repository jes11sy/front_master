'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

interface AuthGuardProps {
  children: React.ReactNode
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Проверяем авторизацию только на клиенте
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
      
      if (!token && !refreshToken) {
        // Если нет ни access, ни refresh токена - перенаправляем на логин
        setIsAuthenticated(false)
        router.push('/login')
      } else {
        // Есть хотя бы один токен - считаем пользователя аутентифицированным
        // API клиент автоматически обновит access токен при необходимости
        setIsAuthenticated(true)
      }
    }
  }, [router])

  // Показываем loading состояние пока проверяем токен
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
