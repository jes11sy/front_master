'use client'

import Image from 'next/image'

const loadingFontStack = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif',
} as const

export type AppLoadingBlockVariant = 'default' | 'compact'

/**
 * Единый маркер загрузки: логотип сверху, круговой индикатор снизу.
 * Используйте внутри страниц (под шапкой), в модалках и т.д.
 */
export function AppLoadingBlock({
  className = '',
  variant = 'default',
}: {
  className?: string
  variant?: AppLoadingBlockVariant
}) {
  const logoClass = variant === 'compact' ? 'h-8 w-auto' : 'h-[52px] w-auto'
  const logoMb = variant === 'compact' ? 'mb-4' : 'mb-7'
  const spinnerClass =
    variant === 'compact'
      ? 'h-8 w-8 animate-spin rounded-full border-2 border-transparent border-b-[#0a4f42] dark:border-b-white'
      : 'h-12 w-12 animate-spin rounded-full border-2 border-transparent border-b-[#0a4f42] dark:border-b-white'

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 ${className}`}
      style={loadingFontStack}
      role="status"
      aria-label="Загрузка"
    >
      <div className={logoMb}>
        <Image
          src="/images/images/logo_light_v2.png"
          alt=""
          width={272}
          height={60}
          className={`${logoClass} object-contain opacity-95 dark:hidden`}
          priority
        />
        <Image
          src="/images/images/logo_dark_v2.png"
          alt=""
          width={272}
          height={60}
          className={`hidden ${logoClass} object-contain opacity-95 dark:block`}
          priority
        />
      </div>
      <div className={spinnerClass} />
    </div>
  )
}

interface LoadingScreenProps {
  /** Текст под спиннером (не используется в новом дизайне) */
  message?: string
  /** Полноэкранный режим */
  fullScreen?: boolean
  /** Дополнительные классы */
  className?: string
  /**
   * Рендер внутри MasterLayout (`main` уже с `pt-16` под фикс. шапку).
   * Без этого `min-h-screen` у лоадера даёт высоту 100vh + отступ main → лишний скролл.
   */
  embeddedInLayout?: boolean
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
  className = '',
  embeddedInLayout = false,
}: LoadingScreenProps) {
  const content = <AppLoadingBlock />

  // Используем CSS-класс dark на html для определения фона без мелькания
  // Класс dark устанавливается синхронным скриптом в layout.tsx до рендеринга React
  const fullScreenHeightClass = embeddedInLayout
    ? 'min-h-[calc(100dvh-4rem)] md:min-h-screen md:min-h-[100dvh]'
    : 'min-h-screen min-h-[100dvh]'

  if (fullScreen) {
    return (
      <div
        className={`relative flex ${fullScreenHeightClass} items-center justify-center overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] transition-colors duration-300 dark:bg-[#111113] dark:text-white ${className}`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_#ffffff,_#f5f5f7),radial-gradient(circle_at_top,_rgba(0,113,227,0.06),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_24%),linear-gradient(180deg,_#111113,_#0c0c0d)]"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full bg-[#0071e3]/6 blur-3xl dark:bg-white/[0.025]"
        />
        {content}
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center bg-[#f5f5f7] py-12 text-[#1d1d1f] transition-colors duration-300 dark:bg-[#111113] dark:text-white ${className}`}
    >
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
      <div className={`${sizeClasses[size]} rounded-full border-2 border-black/10 dark:border-white/20`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} animate-spin rounded-full border-2 border-transparent border-t-[#0a4f42] dark:border-t-white`} />
    </div>
  )
}

/**
 * Состояние загрузки для контента (таблицы, списки и т.д.) — тот же брендовый вид.
 */
export function LoadingState({ 
  message: _message = 'Загрузка...', 
  className = ''
}: { 
  message?: string
  className?: string
}) {
  return <AppLoadingBlock className={`py-8 ${className}`} />
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-[#111113]/80">
          <AppLoadingBlock className="py-4" variant="compact" />
        </div>
      )}
    </div>
  )
}
