'use client'

import { usePathname } from 'next/navigation'
import { SidebarNavigation } from '@/components/sidebar-navigation'
import { useLayout } from '@/components/layout-context'
import React, { useLayoutEffect, useEffect } from 'react'

interface MasterLayoutProps {
  children: React.ReactNode
}

const MasterLayout = React.memo<MasterLayoutProps>(({ children }) => {
  const pathname = usePathname()
  const { hideLayout } = useLayout()
  const isLoginPage = pathname === '/login'
  const isLogoutPage = pathname === '/logout'
  const isPublicPage = isLoginPage || isLogoutPage
  
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

  if (shouldHideLayout) {
    return <>{children}</>
  }

  return (
    <>
      <SidebarNavigation />
      <main className="main-content pt-16 md:pt-0 md:ml-56 min-h-screen">{children}</main>
    </>
  )
})

MasterLayout.displayName = 'MasterLayout'

export default MasterLayout
