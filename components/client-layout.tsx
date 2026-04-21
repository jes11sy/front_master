'use client'

import React, { Component, ReactNode, useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/auth-guard'
import { TokenRefresher } from '@/components/TokenRefresher'
import { useDesignStore } from '@/store/design.store'
import MasterLayout from '@/components/master-layout'

// Error Boundary для перехвата критических ошибок
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Логируем ошибку только в development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
          <div className="max-w-md mx-4">
            <div className="bg-red-600 text-white rounded-2xl p-8 shadow-2xl">
              <div className="text-6xl mb-4 text-center">⚠️</div>
              <h1 className="text-2xl font-bold mb-4 text-center">Произошла ошибка</h1>
              <p className="text-lg mb-6 text-center">
                Что-то пошло не так. Попробуйте обновить страницу.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-white text-red-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-all"
              >
                🔄 Обновить страницу
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Публичные страницы, которые не требуют авторизации
const PUBLIC_PATHS = ['/login', '/logout']

interface ClientLayoutProps {
  children: ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname()
  const isPublicPage = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))
  const isAuthBypassPage = !isPublicPage
  
  // Получаем тему из store
  const theme = useDesignStore((state) => state.theme)
  const hasHydrated = useDesignStore((state) => state._hasHydrated)
  const isDark = theme === 'dark'
  
  // Синхронно применяем тему до отрисовки кадра.
  // Идентично подходу в director, чтобы убрать white flash.
  useLayoutEffect(() => {
    if (!hasHydrated) return

    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
      html.style.backgroundColor = '#111113'
      html.style.colorScheme = 'dark'
    } else {
      html.classList.remove('dark')
      html.style.backgroundColor = '#f5f5f7'
      html.style.colorScheme = ''
    }
  }, [isDark, hasHydrated])

  // Не рендерим контент до гидратации состояния темы.
  const [mounted, setMounted] = React.useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !hasHydrated) {
    return null
  }

  return (
    <ErrorBoundary>
      {!isPublicPage && <TokenRefresher />}
      {isPublicPage ? (
        // Публичные страницы без AuthGuard
        <>{children}</>
      ) : isAuthBypassPage ? (
        // Временный bypass авторизации для всех остальных страниц
        <MasterLayout>
          {children}
        </MasterLayout>
      ) : (
        // Защищённые страницы с AuthGuard
        <AuthGuard>
          <MasterLayout>
            {children}
          </MasterLayout>
        </AuthGuard>
      )}
    </ErrorBoundary>
  )
}
