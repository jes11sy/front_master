'use client'

import { useState, useEffect } from 'react'

// Функция для определения темы из localStorage
function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Сначала проверяем класс на html (самый надёжный способ)
    if (document.documentElement.classList.contains('dark')) {
      return true
    }
    
    // Затем проверяем localStorage
    const stored = localStorage.getItem('design-storage')
    if (stored) {
      const data = JSON.parse(stored)
      if (data?.state?.theme === 'dark') {
        return true
      }
    }
  } catch {
    // Игнорируем ошибки
  }
  
  return false
}

interface LoadingScreenProps {
  /** Текст под спиннером (не используется в новом дизайне) */
  message?: string
  /** Полноэкранный режим */
  fullScreen?: boolean
  /** Дополнительные классы */
  className?: string
}

/**
 * Единый компонент загрузки для всего приложения
 * Используется на:
 * - AuthGuard (проверка сессии)
 * - Suspense fallback
 * - Любые полноэкранные загрузки
 * Минималистичный дизайн: только лого и спиннер
 */
export function LoadingScreen({ 
  fullScreen = true,
  className = ''
}: LoadingScreenProps) {
  // Определяем тему на клиенте - сразу читаем из localStorage/html
  const [isDark, setIsDark] = useState<boolean>(() => getInitialTheme())
  
  useEffect(() => {
    // Обновляем состояние после монтирования (на случай если SSR показал другое)
    setIsDark(getInitialTheme())
    
    // Подписываемся на изменения класса
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

  // Определяем какой логотип показывать
  const logoSrc = isDark 
    ? "/images/images/logo_dark_v2.png" 
    : "/images/images/logo_light_v2.png"

  const content = (
    <div className="flex flex-col items-center justify-center px-4">
      {/* Логотип */}
      <div className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={logoSrc}
          alt="MasterCRM" 
          width={200} 
          height={50} 
          className="h-12 w-auto"
        />
      </div>

      {/* Спиннер */}
      <div className="relative w-12 h-12">
        <div className="w-full h-full rounded-full border-4 border-[#0d5c4b]/20 dark:border-[#0d5c4b]/30" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0d5c4b] animate-spin" />
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`min-h-screen min-h-[100dvh] flex items-center justify-center bg-white dark:bg-[#1e2530] ${className}`}>
        {content}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center py-12 bg-white dark:bg-[#1e2530] ${className}`}>
      {content}
    </div>
  )
}

/**
 * Минимальный спиннер для использования внутри компонентов
 */
export function LoadingSpinner({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 border-[#0d5c4b]/20`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-2 border-transparent border-t-[#0d5c4b] animate-spin`} />
    </div>
  )
}

/**
 * Состояние загрузки для контента (таблицы, списки и т.д.)
 */
export function LoadingState({ 
  message = 'Загрузка...', 
  size = 'md',
  className = ''
}: { 
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-3 ${className}`}>
      <LoadingSpinner size={size} />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
}

/**
 * Оверлей загрузки поверх контента
 */
export function LoadingOverlay({ 
  isLoading, 
  message, 
  children 
}: { 
  isLoading: boolean
  message?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50 bg-white/80 dark:bg-[#1e2530]/80">
          <LoadingState message={message} />
        </div>
      )}
    </div>
  )
}
