'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SidebarNavigation } from '@/components/sidebar-navigation'
import { useLayout } from '@/components/layout-context'
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react'
import apiClient from '@/lib/api'

interface MasterLayoutProps {
  children: React.ReactNode
}

const MasterLayout = React.memo<MasterLayoutProps>(({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { hideLayout } = useLayout()
  const isLoginPage = pathname === '/login'
  const isLogoutPage = pathname === '/logout'
  const isPublicPage = isLoginPage || isLogoutPage
  const [isChecking, setIsChecking] = useState(!isPublicPage)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isOfflineNoData, setIsOfflineNoData] = useState(false)
  
  // Ref для предотвращения дублирующихся проверок auth
  const authCheckInProgress = useRef(false)

  // Список валидных путей приложения
  const validPaths = [
    '/',
    '/orders',
    '/profile',
    '/schedule',
    '/statistics',
    '/payments',
  ]
  
  // Проверяем, является ли путь валидным (начинается с валидного пути)
  const isValidPath = validPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )
  
  // Не показываем layout на странице логина, logout, невалидных путях и когда hideLayout = true
  const shouldHideLayout = isPublicPage || hideLayout || !isValidPath

  // Автоперезагрузка при восстановлении интернета
  useEffect(() => {
    const handleOnline = () => {
      console.log('[MasterLayout] Network online, reloading...')
      window.location.reload()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // Проверка авторизации для защищенных страниц
  useEffect(() => {
    const checkAuth = async () => {
      // Если на публичной странице - пропускаем проверку
      if (isPublicPage) {
        setIsChecking(false)
        setIsAuthChecked(true)
        return
      }
      
      // Предотвращаем дублирующиеся проверки
      if (authCheckInProgress.current) {
        console.log('[MasterLayout] Auth check already in progress - skipping')
        return
      }
      
      authCheckInProgress.current = true

      const isOnline = navigator.onLine

      if (isOnline) {
        // ОНЛАЙН - проверяем через API
        try {
          const response = await apiClient.getProfile()
          
          if (response.success && response.data) {
            setIsAuthChecked(true)
            setIsChecking(false)
          } else {
            // Профиль не получен - редирект на логин
            router.replace('/login')
          }
        } catch (error) {
          // Ошибка при проверке - редирект на логин
          router.replace('/login')
        } finally {
          authCheckInProgress.current = false
        }
      } else {
        // ОФФЛАЙН - редирект на логин
        console.log('[MasterLayout] Offline mode - redirecting to login')
        router.replace('/login')
        authCheckInProgress.current = false
      }
    }

    checkAuth()
  }, [pathname, router, isPublicPage])

  // Принудительно скроллим в начало при смене страницы
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Дополнительная проверка после рендера
  useEffect(() => {
    // Небольшая задержка для гарантии, что DOM обновился
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 0)
    
    return () => clearTimeout(timer)
  }, [pathname])

  // Показываем loading во время проверки авторизации (для защищенных страниц)
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#114643] to-[#1a6962]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Оффлайн режим без данных - показываем экран вместо черного
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
            className="w-full bg-[#114643] hover:bg-[#1a6962] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Попробовать снова
          </button>
          
          <div className="mt-6 p-4 bg-orange-50 rounded-xl">
            <p className="text-sm text-orange-700">
              {typeof navigator !== 'undefined' && navigator.onLine ? '✓ Соединение восстановлено' : '✗ Нет подключения'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Не показываем контент до завершения проверки авторизации
  if (!isPublicPage && !isAuthChecked) {
    // Вместо черного экрана показываем загрузку
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#114643] to-[#1a6962]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Проверка авторизации...</p>
        </div>
      </div>
    )
  }

  if (shouldHideLayout) {
    return <>{children}</>
  }

  return (
    <>
      <SidebarNavigation />
      <main className="pt-16 md:pt-0 md:ml-64">{children}</main>
    </>
  )
})

MasterLayout.displayName = 'MasterLayout'

export default MasterLayout
