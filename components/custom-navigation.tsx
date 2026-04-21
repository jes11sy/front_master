'use client'

import { useState, useEffect, useLayoutEffect, useCallback, memo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { useNotifications } from '@/hooks/useNotifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import {
  Banknote,
  Bell,
  Check,
  ChartColumnBig,
  ClipboardList,
  FileText,
  GripHorizontal,
  Info,
  LogOut,
  MoonStar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SunMedium,
  User,
  Users2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Ключ для сохранения позиции прокрутки
const SCROLL_POSITION_KEY = 'orders_scroll_position'
// Ключ для позиции панели уведомлений
const NOTIFICATIONS_POSITION_KEY = 'notifications-panel-position-dir'
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed-dir'
// Дефолтная позиция
const DEFAULT_POSITION = { x: 240, y: 100 }

const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: ClipboardList },
  { name: 'Статистика', href: '/statistics', icon: ChartColumnBig },
  { name: 'Платежи', href: '/payments', icon: Banknote },
  { name: 'График работы', href: '/schedule', icon: Users2 },
]

/** Порядок вкладок снизу на мобильных: Статистика → Заказы → Платежи */
const mobileBottomTabs = [
  { name: 'Статистика', href: '/statistics', icon: ChartColumnBig },
  { name: 'Заказы', href: '/orders', icon: ClipboardList },
  { name: 'Платежи', href: '/payments', icon: Banknote },
] as const

function isRouteActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/orders' && pathname.startsWith('/orders')) return true
  if (href !== '/orders' && pathname.startsWith(`${href}/`)) return true
  return false
}

/** Фамилия И.О. из полного имени; при отсутствии — логин */
function formatShortFio(fullName: string | undefined, login: string | undefined): string {
  const fallback = login?.trim() || 'Пользователь'
  if (!fullName?.trim()) return fallback
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0]!
  const last = parts[0]!
  const first = parts[1]!
  const pat = parts[2]
  const i1 = first[0]!.toUpperCase()
  if (pat) {
    const i2 = pat[0]!.toUpperCase()
    return `${last} ${i1}.${i2}.`
  }
  return `${last} ${i1}.`
}

function formatNotificationTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'только что'
  if (diffMins < 60) return `${diffMins} мин назад`
  if (diffHours < 24) return `${diffHours} ч назад`
  return `${diffDays} дн назад`
}

function getNotificationTypeIcon(type: string) {
  switch (type) {
    case 'order_created':
    case 'order_edited':
      return FileText
    default:
      return Info
  }
}

// Удалены моковые уведомления - теперь используем реальные из API

// Интерфейс пропсов для MenuContent
interface MenuContentProps {
  isMobile?: boolean
  isCollapsed?: boolean
  pathname: string
  theme: string
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
  onToggleCollapse?: () => void
  // Пропсы для уведомлений (только кнопка)
  onToggleNotifications: () => void
  isNotificationsOpen: boolean
  unreadCount: number
  notificationsButtonRef: React.RefObject<HTMLDivElement | null>
}

// Мемоизированный компонент меню - не пересоздаётся при изменении panelPosition
const MenuContent = memo(function MenuContent({
  isMobile = false,
  isCollapsed = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
  onToggleCollapse,
  onToggleNotifications,
  isNotificationsOpen,
  unreadCount,
  notificationsButtonRef,
}: MenuContentProps) {
  const isActive = (href: string) => isRouteActive(pathname, href)

  const itemBaseClass = isMobile
    ? 'min-h-[52px] rounded-2xl px-4 text-base'
    : isCollapsed
      ? 'min-h-[52px] justify-center rounded-2xl px-0'
      : 'min-h-[48px] rounded-2xl px-4'

  const itemThemeClass = (active: boolean) =>
    active
      ? (isCollapsed && !isMobile
          ? 'bg-transparent text-[#0a4f42] dark:text-white'
          : 'bg-[#0a4f42] text-white dark:bg-white/[0.08] dark:text-white')
      : isMobile
        ? 'text-[#3a3a3c] hover:bg-black/[0.05] hover:text-[#111113] dark:text-white/92 dark:hover:bg-white/[0.04] dark:hover:text-white'
        : isCollapsed
          ? 'bg-transparent text-[#3a3a3c] hover:text-[#111113] dark:text-white/92 dark:hover:text-white'
          : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.05] hover:text-[#111113] dark:text-white/92 dark:hover:bg-white/[0.04] dark:hover:text-white'

  const isProfileActive = isActive('/profile')

  const renderNavItem = (
    item: { name: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }
  ) => {
    const active = isActive(item.href)
    const Icon = item.icon
    const activeCollapsedGlow = active && isCollapsed && !isMobile
      ? (theme === 'dark'
          ? { filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.75))' }
          : { filter: 'drop-shadow(0 0 6px rgba(10,79,66,0.55)) drop-shadow(0 0 14px rgba(10,79,66,0.45))' })
      : undefined

    return (
      <Link
        key={item.name}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        title={!isMobile && isCollapsed ? item.name : undefined}
        className={cn(
          'group relative flex items-center gap-3 transition-all duration-200',
          itemBaseClass,
          itemThemeClass(active),
          !isMobile && !isCollapsed && 'justify-start',
          !isMobile && isCollapsed && 'mx-auto w-14'
        )}
        onClick={onCloseMobileMenu}
      >
        <Icon
          className={cn(
            'shrink-0 transition-colors duration-200',
            !isMobile && isCollapsed && 'transition-transform duration-200 group-hover:scale-110',
            isMobile ? 'h-5 w-5' : isCollapsed ? 'h-6 w-6' : 'h-5 w-5',
            active
              ? (isCollapsed && !isMobile ? 'text-[#0a4f42] dark:text-white' : 'text-white')
              : 'text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white'
          )}
          style={activeCollapsedGlow}
        />
        {(!isCollapsed || isMobile) && (
          <span className={cn(
            'truncate font-medium tracking-[-0.01em]',
            isMobile ? 'text-base' : 'text-base'
          )}>
            {item.name}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      <nav className={cn('flex flex-1 flex-col', isMobile ? 'px-4' : 'px-3')}>
        <div className={cn('space-y-1', isMobile && 'space-y-2')}>
          {navigationItems.map((item) => renderNavItem(item))}
        </div>

        <div className="mt-auto pt-5">
          <div className={cn(
            'mb-3 border-t border-black/[0.06] pt-3 dark:border-white/10',
            isCollapsed && !isMobile && 'mx-auto w-14'
          )}>
            {!isMobile && (
              <div className={cn('relative', isCollapsed && 'mx-auto w-14')} ref={notificationsButtonRef}>
                <button
                  onClick={onToggleNotifications}
                  title={isCollapsed ? 'Уведомления' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 transition-all duration-200',
                    itemBaseClass,
                    itemThemeClass(false),
                    isCollapsed && 'mx-auto w-14 justify-center px-0'
                  )}
                >
                  <div className="relative">
                    <Bell
                      className={cn(
                        isCollapsed ? 'h-6 w-6 transition-colors duration-200' : 'h-5 w-5 transition-colors duration-200',
                        isCollapsed && 'transition-transform duration-200 group-hover:scale-110',
                        isNotificationsOpen
                          ? 'text-[#111113] dark:text-white'
                          : 'text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white'
                      )}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b3261e] px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  {(!isCollapsed || isMobile) && <span className="text-base font-medium tracking-[-0.01em]">Уведомления</span>}
                </button>
              </div>
            )}

            <Link
              href="/profile"
              title={!isMobile && isCollapsed ? (userName || 'Профиль') : undefined}
              className={cn(
                'group relative flex items-center gap-3 transition-all duration-200',
                itemBaseClass,
                itemThemeClass(isProfileActive),
                isCollapsed && !isMobile && 'mx-auto w-14 justify-center px-0'
              )}
              onClick={onCloseMobileMenu}
            >
              <User
                className={cn(
                  isCollapsed ? 'h-6 w-6 shrink-0 transition-colors duration-200' : 'h-5 w-5 shrink-0 transition-colors duration-200',
                  isCollapsed && 'transition-transform duration-200 group-hover:scale-110',
                  isProfileActive
                    ? (isCollapsed && !isMobile ? 'text-[#0a4f42] dark:text-white' : 'text-white')
                    : 'text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white'
                )}
                style={isProfileActive && isCollapsed && !isMobile
                  ? (theme === 'dark'
                      ? { filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.75))' }
                      : { filter: 'drop-shadow(0 0 6px rgba(10,79,66,0.55)) drop-shadow(0 0 14px rgba(10,79,66,0.45))' })
                  : undefined}
              />
              {(!isCollapsed || isMobile) && (
                <span className="truncate text-base font-medium tracking-[-0.01em]">
                  {userName || 'Профиль'}
                </span>
              )}
            </Link>
          </div>

          <div
            className={cn(
              'pt-1',
              isCollapsed && !isMobile && 'mx-auto w-14'
            )}
          >
            <button
              onClick={toggleTheme}
              title={!isMobile && isCollapsed ? 'Переключить тему' : undefined}
              className={cn(
                'group flex items-center gap-3 transition-all duration-200',
                itemBaseClass,
                isMobile
                  ? 'text-[#3a3a3c] hover:bg-black/[0.035] hover:text-[#111113] dark:text-white/92 dark:hover:bg-white/[0.04] dark:hover:text-white'
                  : isCollapsed
                    ? 'bg-transparent text-[#3a3a3c] hover:text-[#111113] dark:text-white/92 dark:hover:text-white'
                    : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] dark:text-white/92 dark:hover:bg-white/[0.04] dark:hover:text-white',
                isCollapsed && !isMobile && 'mx-auto w-14 justify-center px-0'
              )}
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? (
                <MoonStar className={cn(
                  isCollapsed
                    ? 'h-6 w-6 shrink-0 text-[#6e6e73] transition-colors duration-200 group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white'
                    : 'h-5 w-5 shrink-0 text-[#6e6e73] transition-colors duration-200 group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white',
                  isCollapsed && 'transition-transform duration-200 group-hover:scale-110'
                )} />
              ) : (
                <SunMedium className={cn(
                  isCollapsed
                    ? 'h-6 w-6 shrink-0 text-[#6e6e73] transition-colors duration-200 group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white'
                    : 'h-5 w-5 shrink-0 text-[#6e6e73] transition-colors duration-200 group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white',
                  isCollapsed && 'transition-transform duration-200 group-hover:scale-110'
                )} />
              )}
              {(!isCollapsed || isMobile) && (
                <span className="truncate text-base font-medium tracking-[-0.01em]">
                  Тема
                </span>
              )}
            </button>
          </div>

        </div>
      </nav>
    </>
  )
})

function MobileBottomNav({ pathname }: { pathname: string }) {
  const dockCardClass =
    'border border-black/[0.08] bg-[#f5f5f7]/96 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111113]/96 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]'

  const slidingIndicatorClass =
    'pointer-events-none absolute z-0 rounded-[20px] !bg-gray-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.07] dark:!bg-white/[0.12] dark:ring-white/18 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'

  /**
   * Подсветка при :active без второго backdrop-filter на псевдоэлементе — иначе WebKit
   * рисует вертикальный «разрез», если у родителя уже есть backdrop-blur (dock).
   */
  const tabPressGlass =
    'before:absolute before:inset-0 before:z-[2] before:rounded-[20px] before:content-[\'\'] before:pointer-events-none before:opacity-0 before:transition-[opacity,transform] before:duration-200 active:before:opacity-100 motion-safe:active:scale-[0.96] before:bg-black/[0.1] before:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:before:bg-white/[0.14] dark:before:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'

  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const indicatorFirstLayout = useRef(true)
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number
    top: number
    width: number
    height: number
    opacity: number
    transition: string
  }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    transition: 'none',
  })

  const updateSlidingIndicator = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const idx = mobileBottomTabs.findIndex((item) => isRouteActive(pathname, item.href))
    if (idx < 0) {
      setIndicatorStyle((prev) => ({
        ...prev,
        opacity: 0,
        transition: 'opacity 200ms ease-out',
      }))
      return
    }

    const tab = tabRefs.current[idx]
    if (!tab) return

    const tr = track.getBoundingClientRect()
    const r = tab.getBoundingClientRect()

    const smooth =
      'left 320ms cubic-bezier(0.4, 0, 0.2, 1), top 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms cubic-bezier(0.4, 0, 0.2, 1), height 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out'

    setIndicatorStyle({
      left: r.left - tr.left,
      top: r.top - tr.top,
      width: r.width,
      height: r.height,
      opacity: 1,
      transition: indicatorFirstLayout.current ? 'none' : smooth,
    })
    indicatorFirstLayout.current = false
  }, [pathname])

  useLayoutEffect(() => {
    updateSlidingIndicator()
  }, [updateSlidingIndicator])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const ro = new ResizeObserver(() => {
      updateSlidingIndicator()
    })
    ro.observe(track)
    window.addEventListener('orientationchange', updateSlidingIndicator)

    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', updateSlidingIndicator)
    }
  }, [updateSlidingIndicator])

  const tabClass = (active: boolean) =>
    cn(
      'relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] px-1.5 py-2 text-[13px] font-medium tracking-[-0.02em] touch-manipulation [-webkit-tap-highlight-color:transparent]',
      tabPressGlass,
      active
        ? 'text-[#0a4f42] dark:text-white'
        : 'text-[#6e6e73] dark:text-white/55'
    )

  return (
    <nav
      className="mobile-bottom-dock pointer-events-none md:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-transparent shadow-none"
      aria-label="Основная навигация"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-screen-sm items-end justify-center px-4 pb-[max(16px,calc(12px+env(safe-area-inset-bottom,0px)))] pt-2.5 shadow-none">
        <div
          ref={trackRef}
          className={cn(
            'relative isolate flex min-h-[68px] w-full min-w-0 items-stretch gap-1 p-1.5 rounded-[34px]',
            dockCardClass
          )}
        >
          <div
            aria-hidden
            className={slidingIndicatorClass}
            style={{
              left: indicatorStyle.left,
              top: indicatorStyle.top,
              width: indicatorStyle.width,
              height: indicatorStyle.height,
              opacity: indicatorStyle.opacity,
              transition: indicatorStyle.transition,
            }}
          />
          {mobileBottomTabs.map((item, i) => {
            const Icon = item.icon
            const active = isRouteActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={tabClass(active)}
              >
                <span className="relative z-[3] flex flex-col items-center gap-1">
                  <Icon className={cn('h-6 w-6 shrink-0', active && 'text-[#0a4f42] dark:text-white')} />
                  <span className="leading-tight">{item.name}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export function CustomNavigation() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useDesignStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Refs для панелей уведомлений
  const notificationsRef = useRef<HTMLDivElement>(null)
  const mobileNotificationsButtonRef = useRef<HTMLDivElement>(null)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)
  const mobileNotificationsPanelRef = useRef<HTMLDivElement>(null)
  
  // Состояние уведомлений
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  /** Анимация полноэкранной панели уведомлений справа */
  const [mobileNotifPanelEntered, setMobileNotifPanelEntered] = useState(false)
  /** Скрытие баннера про пуши только до закрытия панели уведомлений */
  const [mobilePushPromoDismissed, setMobilePushPromoDismissed] = useState(false)
  const [isMobileProfilePanelOpen, setIsMobileProfilePanelOpen] = useState(false)
  const [mobileProfilePanelEntered, setMobileProfilePanelEntered] = useState(false)
  const [isMobileSettingsPanelOpen, setIsMobileSettingsPanelOpen] = useState(false)
  const [mobileSettingsPanelEntered, setMobileSettingsPanelEntered] = useState(false)
  const [isMobileLogoutLoading, setIsMobileLogoutLoading] = useState(false)
  const { 
    notifications, 
    unreadCount, 
    isLoading: notificationsLoading,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
  } = useNotifications()

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushStateLoading,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isSubscribing: pushSubscribing,
    isUnsubscribing: pushUnsubscribing,
    error: pushError,
  } = usePushNotifications()
  
  // Позиция окна уведомлений (для desktop drag)
  const [panelPosition, setPanelPosition] = useState(DEFAULT_POSITION)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  // Загружаем позицию из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_POSITION_KEY)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        setPanelPosition(pos)
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved === 'true') {
      setIsSidebarCollapsed(true)
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('sidebar-collapsed', isSidebarCollapsed)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed))

    return () => {
      html.classList.remove('sidebar-collapsed')
    }
  }, [isSidebarCollapsed])

  // Сохраняем позицию в localStorage
  const savePosition = useCallback((pos: { x: number; y: number }) => {
    localStorage.setItem(NOTIFICATIONS_POSITION_KEY, JSON.stringify(pos))
  }, [])

  // Обработчики drag
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const panel = notificationsPanelRef.current
    if (panel) {
      const rect = panel.getBoundingClientRect()
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    let lastPos = panelPosition

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(-300, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y))
      lastPos = { x: newX, y: newY }
      setPanelPosition(lastPos)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      savePosition(lastPos)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, panelPosition, savePosition])

  const isMobileViewport = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
    []
  )

  /** Десктоп: закрыть сразу. Мобилка: только задвинуть; isDropdownOpen сбросится в onTransitionEnd */
  const closeDropdown = useCallback(() => {
    if (!isDropdownOpen) return
    if (isMobileViewport()) {
      setMobileNotifPanelEntered(false)
    } else {
      setIsDropdownOpen(false)
    }
  }, [isDropdownOpen, isMobileViewport])

  const toggleDropdown = useCallback(() => {
    if (!isDropdownOpen) {
      setIsDropdownOpen(true)
      return
    }
    if (isMobileViewport()) {
      if (mobileNotifPanelEntered) {
        setMobileNotifPanelEntered(false)
      } else {
        setMobileNotifPanelEntered(true)
      }
    } else {
      setIsDropdownOpen(false)
    }
  }, [isDropdownOpen, mobileNotifPanelEntered, isMobileViewport])

  const handleMobileNotifPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.propertyName !== 'transform') return
      if (!mobileNotifPanelEntered) {
        setIsDropdownOpen(false)
      }
    },
    [mobileNotifPanelEntered]
  )

  const handleMobileProfilePanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.propertyName !== 'transform') return
      if (!mobileProfilePanelEntered) {
        setIsMobileProfilePanelOpen(false)
      }
    },
    [mobileProfilePanelEntered]
  )

  const handleMobileSettingsPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.propertyName !== 'transform') return
      if (!mobileSettingsPanelEntered) {
        setIsMobileSettingsPanelOpen(false)
      }
    },
    [mobileSettingsPanelEntered]
  )

  // Закрываем оверлеи при смене маршрута (без анимации)
  useEffect(() => {
    setIsDropdownOpen(false)
    setMobileNotifPanelEntered(false)
    setMobilePushPromoDismissed(false)
    setIsMobileProfilePanelOpen(false)
    setMobileProfilePanelEntered(false)
    setIsMobileSettingsPanelOpen(false)
    setMobileSettingsPanelEntered(false)
  }, [pathname])

  useEffect(() => {
    if (isDropdownOpen) {
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
      setIsMobileSettingsPanelOpen(false)
      setMobileSettingsPanelEntered(false)
    }
  }, [isDropdownOpen])

  useEffect(() => {
    if (isMobileProfilePanelOpen) {
      setIsDropdownOpen(false)
      setMobileNotifPanelEntered(false)
      setIsMobileSettingsPanelOpen(false)
      setMobileSettingsPanelEntered(false)
    }
  }, [isMobileProfilePanelOpen])

  useEffect(() => {
    if (isMobileSettingsPanelOpen) {
      setIsDropdownOpen(false)
      setMobileNotifPanelEntered(false)
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
    }
  }, [isMobileSettingsPanelOpen])

  useEffect(() => {
    if (!isDropdownOpen) {
      setMobileNotifPanelEntered(false)
      setMobilePushPromoDismissed(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileNotifPanelEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isDropdownOpen])

  useEffect(() => {
    if (!isMobileProfilePanelOpen) {
      setMobileProfilePanelEntered(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileProfilePanelEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isMobileProfilePanelOpen])

  useEffect(() => {
    if (!isMobileSettingsPanelOpen) {
      setMobileSettingsPanelEntered(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileSettingsPanelEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isMobileSettingsPanelOpen])

  // Блокируем скролл: уведомления или панели на мобилке
  useEffect(() => {
    const mobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    const lockNotifications = isDropdownOpen && mobile
    const lockProfile = isMobileProfilePanelOpen && mobile
    const lockSettings = isMobileSettingsPanelOpen && mobile
    if (lockNotifications || lockProfile || lockSettings) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDropdownOpen, isMobileProfilePanelOpen, isMobileSettingsPanelOpen])

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDragging) return
      
      const target = event.target as Node
      const isInsideDesktopButton = notificationsRef.current?.contains(target)
      const isInsideMobileButton = mobileNotificationsButtonRef.current?.contains(target)
      const isInsideDesktopPanel = notificationsPanelRef.current?.contains(target)
      const isInsideMobilePanel = mobileNotificationsPanelRef.current?.contains(target)

      if (
        !isInsideDesktopButton &&
        !isInsideMobileButton &&
        !isInsideDesktopPanel &&
        !isInsideMobilePanel
      ) {
        closeDropdown()
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen, closeDropdown, isDragging])

  // Переход на главную страницу заказов
  const handleLogoClick = () => {
    setIsDropdownOpen(false)
    setMobileNotifPanelEntered(false)
    setIsMobileProfilePanelOpen(false)
    setMobileProfilePanelEntered(false)
    setIsMobileSettingsPanelOpen(false)
    setMobileSettingsPanelEntered(false)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SCROLL_POSITION_KEY)
    }
    router.push('/orders')
  }

  // Обработка клика на уведомление
  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    // Отмечаем как прочитанное
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
    }

    // Переходим на страницу заказа
    if (notification.orderId) {
      router.push(`/orders/${notification.orderId}`)
      if (isMobileViewport()) {
        setMobileNotifPanelEntered(false)
      } else {
        setIsDropdownOpen(false)
      }
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
      setIsMobileSettingsPanelOpen(false)
      setMobileSettingsPanelEntered(false)
    }
  }

  // Пометить все как прочитанные
  const markAllAsRead = () => {
    markAllNotificationsAsRead()
  }

  const userName = user?.name || user?.login

  const closeMobileMenu = useCallback(() => {}, [])
  const closeMobileProfilePanel = useCallback(() => setMobileProfilePanelEntered(false), [])
  const closeMobileSettingsPanel = useCallback(() => setMobileSettingsPanelEntered(false), [])
  const toggleSidebarCollapse = useCallback(() => setIsSidebarCollapsed((prev) => !prev), [])

  const handleMobileSettingsPushToggle = useCallback(async () => {
    if (!pushSupported) return
    if (pushSubscribed) await unsubscribePush()
    else await subscribePush()
  }, [pushSupported, pushSubscribed, subscribePush, unsubscribePush])

  const handleMobileLogout = useCallback(async () => {
    setIsMobileLogoutLoading(true)
    try {
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
      await logout()
      router.push('/login')
    } catch (e) {
      console.error(e)
    } finally {
      setIsMobileLogoutLoading(false)
    }
  }, [logout, router])

  return (
    <>
      {/* Mobile Header */}
      <header className="nav-main md:hidden fixed top-0 left-0 z-[9999] h-16 w-screen border-b border-black/[0.06] px-4 backdrop-blur-xl transition-all dark:border-white/10">
        <div className="mx-auto flex h-full w-full max-w-screen-sm items-center justify-between">
        <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
          <Image
            src="/images/images/logo_light_v2.png"
            alt="Новые Схемы"
            width={148}
            height={36}
            className="h-8 w-auto dark:hidden"
            priority
          />
          <Image
            src="/images/images/logo_dark_v2.png"
            alt="Новые Схемы"
            width={148}
            height={36}
            className="hidden h-8 w-auto dark:block"
            priority
          />
        </button>
        <div className="flex items-center gap-1">
          <div className="relative" ref={mobileNotificationsButtonRef}>
            <button
              type="button"
              onClick={toggleDropdown}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              aria-label="Уведомления"
            >
              <Bell
                className={`h-6 w-6 transition-colors duration-200 ${
                  isDropdownOpen
                    ? 'text-[#111113] dark:text-white'
                    : theme === 'dark'
                      ? 'text-white/72 hover:text-white'
                      : 'text-[#6e6e73] hover:text-[#111113]'
                }`}
              />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              closeDropdown()
              setIsMobileSettingsPanelOpen(false)
              setIsMobileProfilePanelOpen(true)
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
              isRouteActive(pathname, '/profile')
                ? 'text-[#0a4f42] dark:text-white'
                : theme === 'dark'
                  ? 'text-white/72 hover:text-white'
                  : 'text-[#6e6e73] hover:text-[#111113]'
            )}
            aria-label="Профиль"
            title="Профиль"
          >
            <User className="h-6 w-6 transition-colors duration-200" />
          </button>
          <button
            type="button"
            onClick={() => {
              closeDropdown()
              setIsMobileProfilePanelOpen(false)
              setIsMobileSettingsPanelOpen(true)
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
              isMobileSettingsPanelOpen || isRouteActive(pathname, '/profile')
                ? 'text-[#0a4f42] dark:text-white'
                : theme === 'dark'
                  ? 'text-white/72 hover:text-white'
                  : 'text-[#6e6e73] hover:text-[#111113]'
            )}
            aria-label="Настройки"
            title="Настройки"
          >
            <Settings className="h-6 w-6 transition-colors duration-200" />
          </button>
        </div>
        </div>
      </header>

      {/* Мобильные уведомления: полноэкранная панель, выезжает справа */}
      {isDropdownOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть уведомления"
            onClick={closeDropdown}
          />
          <div
            ref={mobileNotificationsPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-notifications-title"
            onTransitionEnd={handleMobileNotifPanelTransitionEnd}
            className={cn(
              'fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden',
              'pt-[env(safe-area-inset-top,0px)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              mobileNotifPanelEntered ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="relative flex min-h-[52px] shrink-0 items-center justify-center border-b border-black/[0.06] px-4 py-2 dark:border-white/10">
              <h3
                id="mobile-notifications-title"
                className="text-center text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Уведомления
              </h3>
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:right-3 sm:gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-[#0a4f42] hover:underline dark:text-white/80 dark:hover:text-white"
                  >
                    <Check className="h-3 w-3" />
                    Прочитать все
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDropdown}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {pushSupported &&
              !pushStateLoading &&
              !pushSubscribed &&
              pushPermission !== 'denied' &&
              !mobilePushPromoDismissed && (
                <div
                  className={cn(
                    'shrink-0 border-b px-3 py-3',
                    theme === 'dark'
                      ? 'border-white/10 bg-transparent'
                      : 'border-black/[0.06] bg-black/[0.04]'
                  )}
                >
                  <div
                    className={cn(
                      'relative rounded-2xl border p-4 pr-11 shadow-sm',
                      theme === 'dark'
                        ? 'border-white/10 bg-[#1e1e21]'
                        : 'border-black/[0.08] bg-white/90'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setMobilePushPromoDismissed(true)}
                      className={cn(
                        'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                        theme === 'dark'
                          ? 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                          : 'text-[#6e6e73] hover:bg-black/[0.06]'
                      )}
                      aria-label="Скрыть"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p
                      className={cn(
                        'text-left text-sm leading-snug',
                        theme === 'dark' ? 'text-white/95' : 'text-[#111113]'
                      )}
                    >
                      Подключите пуши, чтобы узнавать о заказах, не заходя в приложение.
                    </p>
                    <button
                      type="button"
                      onClick={() => void subscribePush()}
                      disabled={pushSubscribing}
                      className={cn(
                        'mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-opacity disabled:opacity-60',
                        theme === 'dark'
                          ? 'bg-white text-[#111113] hover:bg-white/90'
                          : 'bg-[#0a4f42] text-white hover:opacity-95'
                      )}
                    >
                      {pushSubscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Подключение…
                        </>
                      ) : (
                        'Подключить'
                      )}
                    </button>
                  </div>
                </div>
              )}

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto bg-white pb-[env(safe-area-inset-bottom,0px)] dark:bg-[#111113]',
                notifications.length === 0 && 'flex flex-col'
              )}
            >
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = getNotificationTypeIcon(notification.type)
                  return (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void handleNotificationClick(notification)
                        }
                      }}
                      className={`cursor-pointer border-b border-gray-100 px-4 py-3 last:border-0 dark:border-white/10 ${
                        !notification.read
                          ? 'bg-[#0a4f42]/8 hover:bg-[#0a4f42]/14 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${
                              notification.read
                                ? 'text-gray-600 dark:text-gray-300'
                                : 'font-medium text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-white/55">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                            {formatNotificationTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#0d5c4b]" />
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-[32px] border border-black/[0.06] bg-gradient-to-b from-black/[0.03] to-black/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:border-white/10 dark:from-white/[0.06] dark:to-white/[0.03] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
                    aria-hidden
                  >
                    <Bell
                      strokeWidth={1.25}
                      className="h-14 w-14 text-[#0a4f42]/85 dark:text-white/75"
                    />
                  </div>
                  <div className="max-w-[17rem] space-y-2">
                    <p className="text-base font-semibold text-[#111113] dark:text-white">Нет уведомлений</p>
                    <p className="text-sm leading-relaxed text-[#6e6e73] dark:text-white/55">
                      Новые события по заказам появятся здесь
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Мобильная панель профиля (как уведомления — полноэкранно справа) */}
      {isMobileProfilePanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть меню профиля"
            onClick={closeMobileProfilePanel}
          />
          <div
            onTransitionEnd={handleMobileProfilePanelTransitionEnd}
            className={cn(
              'fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden',
              'pt-[env(safe-area-inset-top,0px)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              mobileProfilePanelEntered ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex h-[52px] min-h-[52px] shrink-0 items-center border-b border-black/[0.06] px-2 dark:border-white/10 sm:px-3">
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={() => void handleMobileLogout()}
                  disabled={isMobileLogoutLoading}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
                    theme === 'dark'
                      ? 'text-white/85 hover:bg-white/10 hover:text-red-300'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#b3261e]'
                  )}
                  aria-label="Выйти из аккаунта"
                  title="Выйти"
                >
                  {isMobileLogoutLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <LogOut className="h-6 w-6" />
                  )}
                </button>
              </div>
              <h2 className="m-0 min-w-0 flex-1 truncate text-center text-base font-semibold leading-6 text-[#111113] dark:text-white">
                {formatShortFio(user?.name, user?.login)}
              </h2>
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={closeMobileProfilePanel}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    theme === 'dark'
                      ? 'text-white/90 hover:bg-white/10 hover:text-white'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#111113]'
                  )}
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-6">
              <Link
                href="/profile"
                onClick={closeMobileProfilePanel}
                className={cn(
                  'flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-base font-medium transition-colors active:scale-[0.99]',
                  'border-black/[0.08] bg-[#f5f5f7]/90 text-[#111113] dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
                  isRouteActive(pathname, '/profile') &&
                    'ring-2 ring-[#0a4f42]/30 dark:ring-white/20'
                )}
              >
                <User
                  className={cn(
                    'h-5 w-5 shrink-0',
                    theme === 'dark' ? 'text-white/90' : 'text-[#0a4f42]'
                  )}
                />
                Мой профиль
              </Link>
              <Link
                href="/schedule"
                onClick={closeMobileProfilePanel}
                className={cn(
                  'flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-base font-medium transition-colors active:scale-[0.99]',
                  'border-black/[0.08] bg-[#f5f5f7]/90 text-[#111113] dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
                  isRouteActive(pathname, '/schedule') &&
                    'ring-2 ring-[#0a4f42]/30 dark:ring-white/20'
                )}
              >
                <Users2
                  className={cn(
                    'h-5 w-5 shrink-0',
                    theme === 'dark' ? 'text-white/90' : 'text-[#0a4f42]'
                  )}
                />
                График работы
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Мобильные настройки: тема + push, панель справа */}
      {isMobileSettingsPanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть настройки"
            onClick={closeMobileSettingsPanel}
          />
          <div
            onTransitionEnd={handleMobileSettingsPanelTransitionEnd}
            className={cn(
              'fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden',
              'pt-[env(safe-area-inset-top,0px)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              mobileSettingsPanelEntered ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex h-[52px] min-h-[52px] shrink-0 items-center border-b border-black/[0.06] px-2 dark:border-white/10 sm:px-3">
              <div className="w-11 shrink-0" aria-hidden />
              <h2 className="m-0 min-w-0 flex-1 truncate text-center text-lg font-semibold leading-6 text-[#111113] dark:text-white">
                Настройки
              </h2>
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={closeMobileSettingsPanel}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    theme === 'dark'
                      ? 'text-white/90 hover:bg-white/10 hover:text-white'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#111113]'
                  )}
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-6">
              <div className="rounded-2xl border border-black/[0.08] bg-[#f5f5f7]/90 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {theme === 'dark' ? (
                      <MoonStar className="h-5 w-5 shrink-0 text-white/85" />
                    ) : (
                      <SunMedium className="h-5 w-5 shrink-0 text-[#0a4f42]" />
                    )}
                    <span className="min-w-0 truncate text-base font-medium leading-snug text-[#111113] dark:text-white">
                      {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'dark'}
                    onClick={() => toggleTheme()}
                    className={cn(
                      'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200',
                      theme === 'dark'
                        ? 'bg-[#3a3a3c] dark:bg-white/22'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.08] bg-[#f5f5f7]/90 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Bell className="h-5 w-5 shrink-0 text-[#0a4f42] dark:text-white/80" />
                    <span className="text-base font-medium text-[#111113] dark:text-white">
                      Push-уведомления
                    </span>
                  </div>
                  {pushStateLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#6e6e73]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushSubscribed}
                      disabled={!pushSupported || pushSubscribing || pushUnsubscribing}
                      onClick={() => void handleMobileSettingsPushToggle()}
                      className={cn(
                        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
                        pushSubscribed
                          ? 'bg-[#0a4f42]'
                          : !pushSupported
                            ? 'bg-yellow-400/40 dark:bg-yellow-600/35'
                            : 'bg-gray-300 dark:bg-gray-600'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
                          pushSubscribed ? 'translate-x-6' : 'translate-x-1',
                          !pushSupported && 'bg-yellow-200 dark:bg-yellow-300'
                        )}
                      />
                    </button>
                  )}
                </div>
                {!pushSupported && !pushStateLoading && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-200/80">
                    Уведомления недоступны в этом браузере или режиме. Откройте приложение в поддерживаемом браузере или установите PWA.
                  </p>
                )}
                {pushError && !pushStateLoading && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{pushError}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <MobileBottomNav pathname={pathname} />

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 z-40 h-screen pointer-events-none">
        {/* Logo */}
        <div
          className={cn(
            'pointer-events-auto ml-4 mt-4 flex h-[calc(100vh-2rem)] flex-col rounded-[30px] border p-3 transition-all duration-300',
            theme === 'dark'
              ? 'border-white/10 bg-[#111113]/92 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl'
              : 'border-black/[0.08] bg-[#f5f5f7] shadow-none backdrop-blur-none',
            isSidebarCollapsed ? 'w-[120px]' : 'w-[272px]'
          )}
        >
          <div className={cn(
            'pb-8 pt-3',
            isSidebarCollapsed
              ? 'grid w-full grid-cols-[28px_1fr_28px] items-center px-0'
              : 'flex items-center justify-between px-3'
          )}>
            {isSidebarCollapsed && <span aria-hidden="true" className="block h-7 w-7" />}
            <button
              onClick={handleLogoClick}
              className={cn(
                'bg-transparent border-none cursor-pointer p-0',
                isSidebarCollapsed && 'justify-self-center shrink-0'
              )}
            >
              {isSidebarCollapsed ? (
                <Image
                  src={theme === 'dark' ? '/images/images/favicon.png' : '/images/images/pwa_dark.png'}
                  alt="Новые Схемы"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              ) : (
                <>
                  <Image
                    src="/images/images/logo_light_v2.png"
                    alt="Новые Схемы"
                    width={164}
                    height={42}
                    className="h-10 w-auto object-contain dark:hidden"
                    priority
                  />
                  <Image
                    src="/images/images/logo_dark_v2.png"
                    alt="Новые Схемы"
                    width={164}
                    height={42}
                    className="hidden h-10 w-auto object-contain dark:block"
                    priority
                  />
                </>
              )}
            </button>
            {isSidebarCollapsed ? (
              <button
                onClick={toggleSidebarCollapse}
                className="flex h-7 w-7 items-center justify-center justify-self-end rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                aria-label="Развернуть меню"
                title="Развернуть меню"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={toggleSidebarCollapse}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                aria-label="Свернуть меню"
                title="Свернуть меню"
              >
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          <MenuContent
            isMobile={false}
            isCollapsed={isSidebarCollapsed}
            pathname={pathname}
            theme={theme}
            toggleTheme={toggleTheme}
            userName={userName}
            onCloseMobileMenu={closeMobileMenu}
            onToggleCollapse={toggleSidebarCollapse}
            onToggleNotifications={toggleDropdown}
            isNotificationsOpen={isDropdownOpen}
            unreadCount={unreadCount}
            notificationsButtonRef={notificationsRef}
          />
        </div>
      </aside>

      {/* Desktop Notifications Panel - вынесено за пределы сайдбара */}
      {isDropdownOpen && (
        <div 
          ref={notificationsPanelRef}
          className="hidden md:flex fixed w-[380px] max-h-[460px] rounded-[20px] shadow-2xl border border-black/[0.06] dark:border-white/10 overflow-hidden z-[9999] flex-col bg-white dark:bg-[#111113]"
          style={{ left: panelPosition.x, top: panelPosition.y }}
        >
          {/* Header - draggable */}
          <div 
            className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0 cursor-move select-none bg-black/[0.02] dark:bg-white/[0.03]"
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-4 w-4 text-gray-400 dark:text-white/40" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Уведомления</h3>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                  className="text-xs text-[#0a4f42] hover:underline flex items-center gap-1 dark:text-white/80 dark:hover:text-white"
                >
                  <Check className="h-3 w-3" />
                  Прочитать все
                </button>
              )}
            </div>
          </div>
          
          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111113]">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = getNotificationTypeIcon(notification.type)
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b border-gray-100 dark:border-white/10 last:border-0 cursor-pointer ${
                      !notification.read 
                        ? 'bg-[#0a4f42]/8 hover:bg-[#0a4f42]/14 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]' 
                        : 'bg-white dark:bg-[#111113] hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-gray-400 dark:text-white/45">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-white/55 mt-0.5 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-[#0d5c4b] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-12 text-center text-gray-500 dark:text-white/55">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                  <Bell className="h-7 w-7 opacity-70" />
                </div>
                <p className="text-sm">Нет уведомлений</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
