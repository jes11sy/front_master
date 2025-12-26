'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'
import { getSavedCredentials } from '@/lib/remember-me'

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
      // DEBUG: Логируем начало проверки
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_check_start', new Date().toISOString())
      }

      try {
        const response = await apiClient.getProfile()
        
        if (response.success && response.data) {
          setIsAuthenticated(true)
          
          // DEBUG
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Профиль получен через cookies (автовход не требуется)')
            localStorage.setItem('auth_check_result', 'success_with_cookies')
          }
        } else {
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_check_result', 'profile_failed_trying_autologin')
          }
          // Пробуем автовход
          const autoLoginSuccess = await tryAutoLogin()
          if (!autoLoginSuccess) {
            setIsAuthenticated(false)
            router.push('/login')
          } else {
            setIsAuthenticated(true)
          }
        }
      } catch (error) {
        // Ошибка - пробуем автовход
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_check_result', 'profile_error_trying_autologin: ' + String(error))
        }

        const autoLoginSuccess = await tryAutoLogin()
        if (!autoLoginSuccess) {
          setIsAuthenticated(false)
          router.push('/login')
        } else {
          setIsAuthenticated(true)
        }
      }
    }

    const tryAutoLogin = async (): Promise<boolean> => {
      console.log('[Auth] Starting auto-login attempt...')
      if (typeof window !== 'undefined') {
        localStorage.setItem('auto_login_last_attempt', new Date().toISOString())
      }

      try {
        const { getSavedCredentials } = await import('@/lib/remember-me')
        console.log('[Auth] Checking for saved credentials...')
        const credentials = await getSavedCredentials()

        if (credentials) {
          console.log('[Auth] Found saved credentials for user:', credentials.login)
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Найдены данные для: ' + credentials.login)
          }

          // Пытаемся авторизоваться с сохраненными данными
          const loginResponse = await apiClient.login(
            credentials.login,
            credentials.password,
            true
          )

          console.log('[Auth] Login response:', loginResponse)

          if (loginResponse && loginResponse.success) {
            console.log('[Auth] Auto-login successful')
            if (typeof window !== 'undefined') {
              localStorage.setItem('auto_login_debug', 'Автовход успешен!')
              localStorage.setItem('auto_login_last_success', new Date().toISOString())
            }
            return true
          } else {
            console.warn('[Auth] Login response was not successful')
            if (typeof window !== 'undefined') {
              localStorage.setItem('auto_login_debug', 'Ошибка: неверный ответ сервера')
            }
          }
        } else {
          console.log('[Auth] No saved credentials found')
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Сохраненные данные не найдены')
          }
        }

        return false
      } catch (error) {
        console.error('[Auth] Auto-login failed:', error)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auto_login_debug', 'Ошибка: ' + String(error))
        }
        
        // Очищаем невалидные данные
        try {
          const { clearSavedCredentials } = await import('@/lib/remember-me')
          await clearSavedCredentials()
        } catch (e) {
          console.error('[Auth] Failed to clear credentials:', e)
        }
        
        return false
      }
    }

    checkAuth()
  }, [router])

  // Показываем loading состояние пока проверяем сессию
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#114643] to-[#1a6962]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Проверка авторизации...</p>
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
