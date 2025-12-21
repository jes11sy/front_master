'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'
import { getProfile as getOfflineProfile, saveProfile } from '@/lib/offline-db'
import { getSavedCredentials } from '@/lib/remember-me'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * 🍪 AuthGuard с поддержкой httpOnly cookies и оффлайн режима
 * Проверяет сессию через API вместо чтения localStorage
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [isOfflineNoData, setIsOfflineNoData] = useState(false) // Оффлайн без данных

  // Слушаем изменения статуса сети
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Auth] Network online, reloading...')
      window.location.reload()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  useEffect(() => {
    // 🍪 Проверяем сессию через API - токены в httpOnly cookies
    const checkAuth = async () => {
      const isOnline = navigator.onLine

      // DEBUG: Логируем начало проверки
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_check_start', new Date().toISOString())
        localStorage.setItem('auth_check_online_status', isOnline ? 'online' : 'offline')
      }

      if (isOnline) {
        // ОНЛАЙН - проверяем через сервер
        try {
          const response = await apiClient.getProfile()
          
          if (response.success && response.data) {
            setIsAuthenticated(true)
            setIsOfflineMode(false)
            
            // Сохраняем профиль для оффлайн доступа
            await saveProfile({
              id: response.data.id,
              login: response.data.login,
              name: response.data.name || response.data.login,
              role: 'master',
            })
            
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
              setIsOfflineMode(false)
            }
          }
        } catch (error) {
          // Ошибка онлайн - пробуем автовход
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_check_result', 'profile_error_trying_autologin: ' + String(error))
          }

          const autoLoginSuccess = await tryAutoLogin()
          if (!autoLoginSuccess) {
            setIsAuthenticated(false)
            router.push('/login')
          } else {
            setIsAuthenticated(true)
            setIsOfflineMode(false)
          }
        }
      } else {
        // ОФФЛАЙН - проверяем локальные данные
        console.log('[Auth] Offline mode - checking local data...')
        
        const localProfile = await getOfflineProfile()
        const credentials = await getSavedCredentials()
        
        if (localProfile && credentials) {
          // Есть локальные данные - разрешаем вход в оффлайн режиме
          console.log('[Auth] Offline login successful with local data')
          setIsAuthenticated(true)
          setIsOfflineMode(true)
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_check_result', 'offline_mode_local_data_found')
            localStorage.setItem('auto_login_debug', 'Оффлайн режим: вход по локальным данным')
          }
        } else {
          // Нет локальных данных - показываем экран оффлайн режима
          console.log('[Auth] Offline mode - no local data, showing offline screen')
          setIsAuthenticated(false)
          setIsOfflineNoData(true) // Показываем экран оффлайн без данных
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_check_result', 'offline_mode_no_local_data')
          }
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
            // Успешная авторизация - сохраняем профиль
            if (loginResponse.data) {
              await saveProfile({
                id: loginResponse.data.id,
                login: loginResponse.data.login,
                name: loginResponse.data.name || loginResponse.data.login,
                role: 'master',
              })
            }
            
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

  // Оффлайн режим без данных - показываем красивый экран вместо черного
  if (isOfflineNoData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#114643] to-[#1a6962] p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-[#114643] mb-4">Нет подключения к интернету</h1>
          
          <p className="text-gray-600 mb-6">
            Для первого входа необходимо подключение к интернету. 
            После успешного входа данные будут сохранены для оффлайн работы.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#114643] hover:bg-[#1a6962] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
          >
            Попробовать снова
          </button>
          
          <div className="mt-6 p-4 bg-orange-50 rounded-xl">
            <p className="text-sm text-orange-700">
              {navigator.onLine ? '✓ Соединение восстановлено' : '✗ Нет подключения'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Если не аутентифицирован (онлайн, но не авторизован), не показываем содержимое
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
