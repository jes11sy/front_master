'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SidebarNavigation } from '@/components/sidebar-navigation'
import { useLayout } from '@/components/layout-context'
import { OfflineIndicator } from '@/components/offline-indicator'
import React, { useEffect, useLayoutEffect, useState } from 'react'
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

  // Проверка авторизации для защищенных страниц
  useEffect(() => {
    const checkAuth = async () => {
      // Если на публичной странице - пропускаем проверку
      if (isPublicPage) {
        setIsChecking(false)
        setIsAuthChecked(true)
        return
      }

      try {
        // Проверяем сессию через API - токены в httpOnly cookies
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Не показываем контент до завершения проверки авторизации
  if (!isPublicPage && !isAuthChecked) {
    return null
  }

  if (shouldHideLayout) {
    return (
      <>
        <OfflineIndicator />
        {children}
      </>
    )
  }

  return (
    <>
      <OfflineIndicator />
      <SidebarNavigation />
      <main className="pt-16 md:pt-0 md:ml-64">{children}</main>
    </>
  )
})

MasterLayout.displayName = 'MasterLayout'

export default MasterLayout
