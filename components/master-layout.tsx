'use client'

import { usePathname } from 'next/navigation'
import { SidebarNavigation } from '@/components/sidebar-navigation'
import React, { useEffect, useLayoutEffect } from 'react'

interface MasterLayoutProps {
  children: React.ReactNode
}

const MasterLayout = React.memo<MasterLayoutProps>(({ children }) => {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const is404Page = pathname === '/404'

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

  // Не показываем layout на странице логина и 404
  if (isLoginPage || is404Page) {
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
