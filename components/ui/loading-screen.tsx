'use client'

import Image from 'next/image'
import { useDesignStore } from '@/store/design.store'
import { useState, useEffect, useSyncExternalStore } from 'react'

interface LoadingScreenProps {
  /** Текст под спиннером (не используется в новом дизайне) */
  message?: string
  /** Полноэкранный режим */
  fullScreen?: boolean
  /** Дополнительные классы */
  className?: string
}

/**
 * Хук для определения темы без мелькания
 * Использует useSyncExternalStore для синхронной проверки DOM
 */
function useThemeWithoutFlash() {
  const { theme } = useDesignStore()
  
  // Проверяем DOM синхронно
  const isDarkFromDOM = useSyncExternalStore(
    // subscribe - подписываемся на изменения класса
    (callback) => {
      if (typeof window === 'undefined') return () => {}
      const observer = new MutationObserver(callback)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      return () => observer.disconnect()
    },
    // getSnapshot - получаем текущее значение на клиенте
    () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark'),
    // getServerSnapshot - значение на сервере
    () => false
  )
  
  // После гидратации используем store
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  
  return hydrated ? theme === 'dark' : isDarkFromDOM
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
  const isDark = useThemeWithoutFlash()

  const content = (
    <div className="flex flex-col items-center justify-center px-4">
      {/* Логотип - показываем оба и скрываем один через CSS для избежания мерцания */}
      <div className="mb-8 relative">
        {/* Светлый логотип - скрывается в темной теме */}
        <Image 
          src="/images/images/logo_light_v2.png"
          alt="MasterCRM" 
          width={200} 
          height={50} 
          className={`h-12 w-auto transition-opacity duration-0 ${isDark ? 'opacity-0 absolute' : 'opacity-100'}`}
          priority
        />
        {/* Темный логотип - показывается в темной теме */}
        <Image 
          src="/images/images/logo_dark_v2.png"
          alt="MasterCRM" 
          width={200} 
          height={50} 
          className={`h-12 w-auto transition-opacity duration-0 ${isDark ? 'opacity-100' : 'opacity-0 absolute'}`}
          priority
        />
      </div>

      {/* Спиннер */}
      <div className="relative w-12 h-12">
        <div className={`w-full h-full rounded-full border-4 ${isDark ? 'border-[#0d5c4b]/30' : 'border-[#0d5c4b]/20'}`} />
        <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-[#0d5c4b] animate-spin`} />
      </div>
    </div>
  )

  // Используем CSS-класс dark на html для определения фона без мелькания
  // Класс dark устанавливается синхронным скриптом в layout.tsx до рендеринга React
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
