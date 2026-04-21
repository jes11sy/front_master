'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api"
import { sanitizeString } from "@/lib/sanitize"
import { logger } from "@/lib/logger"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "@/components/ui/toast"
import { validators, validateField } from "@/lib/validation"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useDesignStore } from "@/store/design.store"
import { ArrowRight, CircleUserRound, Eye, EyeOff, LockKeyhole, MoonStar, SunMedium } from 'lucide-react'

// Компонент формы логина (использует useSearchParams)
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const hasCheckedAuth = useRef(false)
  
  // Rate Limiting: защита от брутфорс атак
  const [attemptCount, setAttemptCount] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const MAX_ATTEMPTS = 10 // Максимум попыток
  const BLOCK_DURATION = 5 * 60 * 1000 // 5 минут в миллисекундах
  
  // Тема дизайна
  const { theme, toggleTheme } = useDesignStore()
  
  /**
   * Безопасная валидация redirect URL
   * Защита от Open Redirect атаки
   */
  const getSafeRedirectUrl = useCallback((): string => {
    const redirect = searchParams.get('redirect')
    
    // Если redirect не указан - дефолтная страница
    if (!redirect) {
      return '/orders'
    }
    
    // Проверяем что это внутренний URL
    // ✅ Разрешено: /orders, /profile, /dashboard
    // ❌ Запрещено: //evil.com, https://evil.com, javascript:alert(1)
    
    // Должен начинаться с /
    if (!redirect.startsWith('/')) {
      logger.warn('Blocked external redirect attempt', { redirect })
      return '/orders'
    }
    
    // НЕ должен начинаться с // (protocol-relative URL)
    if (redirect.startsWith('//')) {
      logger.warn('Blocked protocol-relative redirect', { redirect })
      return '/orders'
    }
    
    // НЕ должен содержать опасные протоколы
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    const lowerRedirect = redirect.toLowerCase()
    if (dangerousProtocols.some(protocol => lowerRedirect.includes(protocol))) {
      logger.warn('Blocked dangerous protocol in redirect', { redirect })
      return '/orders'
    }
    
    // Валидация пройдена - можно редиректить
    return redirect
  }, [searchParams])
  
  // Проверяем авторизацию при загрузке страницы логина
  useEffect(() => {
    // Предотвращаем повторную проверку
    if (hasCheckedAuth.current) return
    hasCheckedAuth.current = true
    
    const checkAuth = async () => {
      try {
        // 1. Проверяем активную сессию через cookies
        const isAlreadyAuthenticated = await apiClient.isAuthenticated()
        if (isAlreadyAuthenticated) {
          logger.debug('User already authenticated via cookies, redirecting')
          router.replace(getSafeRedirectUrl())
          return
        }
        
        // 2. Cookies не работают — пробуем восстановить через IndexedDB
        logger.debug('Cookies invalid, trying to restore from IndexedDB')
        const restored = await apiClient.restoreSessionFromIndexedDB()
        
        if (restored) {
          logger.debug('Session restored from IndexedDB, redirecting')
          router.replace(getSafeRedirectUrl())
          return
        }
      } catch (error) {
        logger.debug('Auth check failed, showing login form')
      }
      
      // Показываем форму логина
      setIsCheckingAuth(false)
    }
    
    checkAuth()
  }, [router, getSafeRedirectUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем блокировку ПЕРЕД любыми действиями
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingSeconds = Math.ceil((blockedUntil - Date.now()) / 1000)
      const minutes = Math.floor(remainingSeconds / 60)
      const seconds = remainingSeconds % 60
      toast.error(
        `🔒 Слишком много попыток входа. Попробуйте через ${minutes}:${seconds.toString().padStart(2, '0')}`
      )
      return
    }
    
    // Если блокировка истекла - сбрасываем
    if (blockedUntil && Date.now() >= blockedUntil) {
      setBlockedUntil(null)
      setAttemptCount(0)
    }
    
    setIsLoading(true)
    setErrors({}) // Очищаем предыдущие ошибки
    
    try {
      // Санитизация ввода перед отправкой
      const sanitizedLogin = sanitizeString(login)
      const sanitizedPassword = password // Пароль не санитизируем, но и не логируем
      
      // Валидация логина
      const loginError = validateField(sanitizedLogin, [
        validators.required('Введите логин'),
        validators.minLength(2, 'Логин слишком короткий'),
        validators.maxLength(50, 'Логин слишком длинный'),
      ])
      
      // Валидация пароля (мягкая проверка для входа, строгие требования на backend при создании)
      const passwordError = validateField(sanitizedPassword, [
        validators.required('Введите пароль'),
        validators.minLength(1, 'Пароль не может быть пустым'), // Мягкая проверка - только не пустой
        validators.maxLength(100, 'Максимум 100 символов'),
      ])
      
      // Если есть ошибки валидации - показываем их
      if (loginError || passwordError) {
        setErrors({
          login: loginError || undefined,
          password: passwordError || undefined,
        })
        toast.error(loginError || passwordError || 'Проверьте введенные данные')
        setIsLoading(false)
        return
      }
      
      const data = await apiClient.login(sanitizedLogin, sanitizedPassword)
      
      // ✅ УСПЕШНЫЙ ВХОД - сбрасываем счетчик попыток
      setAttemptCount(0)
      setBlockedUntil(null)
      
      logger.info('Пользователь успешно авторизован')
      
      // Безопасный редирект (защита от Open Redirect атаки)
      const safeRedirectUrl = getSafeRedirectUrl()
      router.replace(safeRedirectUrl)
    } catch (error) {
      // ❌ НЕУДАЧНАЯ ПОПЫТКА - увеличиваем счетчик
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      
      // Проверяем достигнут ли лимит попыток
      if (newAttemptCount >= MAX_ATTEMPTS) {
        const blockTime = Date.now() + BLOCK_DURATION
        setBlockedUntil(blockTime)
        logger.warn('Login attempts exceeded', { attemptCount: newAttemptCount })
      } else {
        const errorMessage = getErrorMessage(error, 'Неверный логин или пароль')
        const isConnectionError =
          !!errorMessage &&
          (
            errorMessage.includes('Нет подключения к интернету') ||
            errorMessage.includes('Проверьте соединение') ||
            errorMessage.includes('Таймаут')
          )
        
        if (errorMessage && !errorMessage.includes('SESSION_EXPIRED') && !isConnectionError) {
          toast.error(errorMessage)
        }
      }
      
      setIsLoading(false)
    }
  }

  // Показываем экран загрузки во время проверки авторизации
  if (isCheckingAuth) {
    return <LoadingScreen message="Проверка авторизации" />
  }

  return (
    <div 
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#111113] text-white'
          : 'bg-[#f5f5f7] text-[#1d1d1f]'
      }`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif'
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          theme === 'dark'
            ? 'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_24%),linear-gradient(180deg,_#111113,_#0c0c0d)]'
            : 'bg-[linear-gradient(180deg,_#ffffff,_#f5f5f7),radial-gradient(circle_at_top,_rgba(0,113,227,0.06),_transparent_28%)]'
        }`}
      />
      <div
        className={`pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${
          theme === 'dark' ? 'bg-white/[0.025]' : 'bg-[#0071e3]/6'
        }`}
      />

      <button
        onClick={toggleTheme}
        className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          theme === 'dark'
            ? 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
            : 'border-black/[0.06] bg-white/70 text-[#6e6e73] hover:bg-white'
        }`}
        title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      >
        {theme === 'dark' ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </button>

      <div className="relative w-full max-w-[360px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-7 flex justify-center">
            <Image
              src={theme === 'dark' ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"}
              alt="Новые Схемы"
              width={272}
              height={60}
              className="h-[52px] w-auto object-contain opacity-95"
              priority
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login" className="sr-only">
                Логин
              </Label>
              <div
                className={`group relative overflow-hidden rounded-2xl border transition-all ${
                  errors.login
                    ? 'border-red-400/70'
                    : theme === 'dark'
                      ? 'border-white/10 bg-[#1c1c1e]'
                      : 'border-[#d2d2d7] bg-white/95'
                } ${
                  theme === 'dark'
                    ? 'focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                    : 'focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                }`}
              >
                <CircleUserRound
                  className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors ${
                    theme === 'dark'
                      ? 'text-white/35 group-focus-within:text-white/70'
                      : 'text-[#8e8e93] group-focus-within:text-[#0a4f42]'
                  }`}
                />
                <input
                  id="login"
                  type="text"
                  placeholder="Введите логин"
                  value={login}
                  onChange={(e) => {
                    setLogin(sanitizeString(e.target.value))
                    if (errors.login) setErrors(prev => ({ ...prev, login: undefined }))
                  }}
                  className={`login-page-input h-[56px] w-full border-0 bg-transparent pl-12 pr-4 text-[16px] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                    theme === 'dark'
                      ? 'text-white placeholder:text-white/25'
                      : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                  }`}
                  style={{ WebkitAppearance: 'none' }}
                  required
                  autoComplete="username"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="sr-only">
                Пароль
              </Label>
              <div
                className={`group relative overflow-hidden rounded-2xl border transition-all ${
                  errors.password
                    ? 'border-red-400/70'
                    : theme === 'dark'
                      ? 'border-white/10 bg-[#1c1c1e]'
                      : 'border-[#d2d2d7] bg-white/95'
                } ${
                  theme === 'dark'
                    ? 'focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                    : 'focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                }`}
              >
                <LockKeyhole
                  className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors ${
                    theme === 'dark'
                      ? 'text-white/35 group-focus-within:text-white/70'
                      : 'text-[#8e8e93] group-focus-within:text-[#0a4f42]'
                  }`}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  className={`login-page-input h-[56px] w-full border-0 bg-transparent pl-12 pr-12 text-[16px] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                    theme === 'dark'
                      ? 'text-white placeholder:text-white/25'
                      : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                  }`}
                  style={{ WebkitAppearance: 'none' }}
                  required
                  autoComplete="current-password"
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'text-white/38 hover:bg-white/5 hover:text-white/72'
                      : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                  }`}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          </div>

          {errors.login && (
            <p className="text-center text-sm text-red-400">
              {sanitizeString(errors.login)}
            </p>
          )}
          {errors.password && (
            <p className="text-center text-sm text-red-400">
              {sanitizeString(errors.password)}
            </p>
          )}

          {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !blockedUntil && (
            <div className="px-1 pt-0.5">
              <p className={`text-center text-[13px] ${
                theme === 'dark' ? 'text-red-300/80' : 'text-[#b3261e]'
              }`}>
                Неверный логин или пароль
              </p>
            </div>
          )}

          {blockedUntil && Date.now() < blockedUntil && (
            <div className="px-1 pt-0.5">
              <p className={`text-center text-[13px] ${
                theme === 'dark' ? 'text-red-300/80' : 'text-[#b3261e]'
              }`}>
                Превышен лимит попыток входа. Повторите через 5 минут.
              </p>
            </div>
          )}

          <Button
            type="submit"
            className={`h-14 w-full rounded-full border-0 px-5 text-[17px] font-medium shadow-none transition-colors ${
              theme === 'dark'
                ? 'bg-white text-[#111113] hover:bg-white/90'
                : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'
            }`}
            disabled={isLoading || (blockedUntil !== null && Date.now() < blockedUntil)}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="mr-3 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Вход...
              </span>
            ) : blockedUntil && Date.now() < blockedUntil ? (
              'Заблокировано'
            ) : (
              <span className="flex items-center justify-center gap-2">
                Войти
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </div>

      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs transition-colors ${
        theme === 'dark' ? 'text-white/35' : 'text-[#6e6e73]'
      }`}>
        © 2026 Новые Схемы
      </div>
    </div>
  )
}

// Главный компонент страницы с Suspense (требование Next.js 15 для useSearchParams)
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Загрузка" />}>
      <LoginForm />
    </Suspense>
  )
}
