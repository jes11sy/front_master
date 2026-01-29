'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface LoadingScreenProps {
  /** Текст под спиннером */
  message?: string
  /** Показывать логотип */
  showLogo?: boolean
  /** Полноэкранный режим */
  fullScreen?: boolean
}

/**
 * Единый компонент загрузки для всего приложения
 * Используется на:
 * - Странице логина (проверка автовхода)
 * - AuthGuard (проверка сессии)
 * - Suspense fallback
 */
export function LoadingScreen({ 
  message = 'Загрузка...', 
  showLogo = true,
  fullScreen = true 
}: LoadingScreenProps) {
  const [dots, setDots] = useState('')

  // Анимация точек в тексте
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const content = (
    <div className="flex flex-col items-center justify-center px-4">
      {/* Логотип с пульсацией */}
      {showLogo && (
        <div className="mb-6 sm:mb-8 relative flex items-center justify-center">
          {/* Внешнее свечение - белое, чтобы контрастировало с зелёным лого */}
          <div className="absolute w-20 h-20 sm:w-28 sm:h-28 bg-white/15 blur-2xl rounded-full animate-pulse" />
          
          {/* Логотип - адаптивный размер */}
          <div className="relative animate-pulse" style={{ animationDuration: '2s' }}>
            <Image 
              src="/images/logo.png" 
              alt="Новые Схемы" 
              width={100} 
              height={100}
              className="w-20 h-20 sm:w-[100px] sm:h-[100px] drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]"
              priority
            />
          </div>
        </div>
      )}

      {/* Спиннер - адаптивный размер */}
      <div className="relative mb-4 sm:mb-6 w-12 h-12 sm:w-14 sm:h-14">
        {/* Внешнее кольцо */}
        <div className="w-full h-full rounded-full border-[3px] sm:border-4 border-white/20" />
        
        {/* Вращающееся кольцо */}
        <div className="absolute inset-0 rounded-full border-[3px] sm:border-4 border-transparent 
                        border-t-white border-r-white/50 animate-spin" />
        
        {/* Внутреннее кольцо (вращается в другую сторону) */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full 
                        border-[3px] sm:border-4 border-transparent border-b-white/70 border-l-white/30 animate-spin"
             style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>

      {/* Текст загрузки */}
      <div className="text-white text-base sm:text-lg font-medium text-center">
        {message.replace('...', '')}{dots}
      </div>
      
      {/* Прогресс-бар (декоративный) */}
      <div className="mt-4 sm:mt-6 w-40 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-white/50 to-white rounded-full animate-loading-bar" />
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center" 
           style={{ backgroundColor: '#114643' }}>
        {content}
      </div>
    )
  }

  return content
}

/**
 * Минимальный спиннер для использования внутри компонентов
 * @param variant - 'light' для тёмного фона, 'dark' для светлого фона
 */
export function LoadingSpinner({ 
  size = 'md', 
  variant = 'light',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const colorClasses = {
    light: {
      ring: 'border-white/20',
      spinner: 'border-t-white border-r-white/50'
    },
    dark: {
      ring: 'border-gray-300',
      spinner: 'border-t-teal-600 border-r-teal-600/50'
    }
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 ${colorClasses[variant].ring}`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-2 border-transparent 
                      ${colorClasses[variant].spinner} animate-spin`} />
    </div>
  )
}
