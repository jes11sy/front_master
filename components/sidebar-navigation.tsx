'use client'

import { useState, useEffect, useCallback, memo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Sun, Moon, User, Menu, X, Bell, Check, FileText, Info, GripHorizontal } from 'lucide-react'

// Ключ для localStorage
const NOTIFICATIONS_POSITION_KEY = 'master-notifications-panel-position'

// Дефолтная позиция
const DEFAULT_POSITION = { x: 240, y: 100 }

// Тип уведомления
interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  orderId?: number
}

// Навигационные элементы с иконками
const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/images/navigate/orders.svg' },
  { name: 'Статистика', href: '/statistics', icon: '/images/images/navigate/reports.svg' },
  { name: 'Платежи', href: '/payments', icon: '/images/images/navigate/cash.svg' },
  { name: 'График работы', href: '/schedule', icon: '/images/images/navigate/employees.svg' },
]

// Форматирование времени уведомления
const formatTime = (dateString: string) => {
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

// Иконка для типа уведомления
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order_created':
    case 'order_edited':
      return FileText
    default:
      return Info
  }
}

// Вынесено за пределы компонента, чтобы React не пересоздавал при каждом рендере
interface MenuContentProps {
  isMobile?: boolean
  pathname: string
  theme: string
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
  // Пропсы для уведомлений (только кнопка)
  onToggleNotifications: () => void
  unreadCount: number
}

const MenuContent = memo(function MenuContent({
  isMobile = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
  onToggleNotifications,
  unreadCount,
}: MenuContentProps) {
  // Проверка активности с учетом подстраниц
  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/orders' && pathname.startsWith(href + '/')) return true
    return false
  }

  return (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-4' : 'space-y-3'}`}>
        {navigationItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${
                isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
              }`}
              onClick={onCloseMobileMenu}
            >
              {/* Индикатор активной вкладки - тонкая скобка */}
              <span 
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] transition-opacity duration-200 ${
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                } ${isMobile ? 'h-12' : 'h-10'}`}
              >
                <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
                  <path 
                    d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                    stroke="#0d5c4b" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
              <Image 
                src={item.icon} 
                alt={item.name} 
                width={isMobile ? 24 : 20} 
                height={isMobile ? 24 : 20} 
                className={`nav-icon transition-all duration-200 ${active ? 'nav-icon-active' : ''} ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`}
              />
              <span className={`transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              } group-hover:text-[#0d5c4b]`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`px-5 pb-6 ${isMobile ? 'space-y-4' : 'space-y-3'}`}>
        {/* Theme Toggle */}
        <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
          <Sun className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'light' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              theme === 'dark' ? 'bg-[#0d5c4b]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <Moon className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'dark' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
        </div>

        {/* Notifications - только в десктопном сайдбаре */}
        {!isMobile && (
          <div className="relative">
            <button
              onClick={onToggleNotifications}
              className="nav-icon-hover relative flex items-center gap-3 px-3 py-2.5 text-sm font-normal group w-full text-left"
            >
              <span 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-10 transition-opacity duration-200 opacity-0 group-hover:opacity-50"
              >
                <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
                  <path 
                    d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                    stroke="#0d5c4b" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
              <div className="relative">
                <Bell className={`h-5 w-5 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              } group-hover:text-[#0d5c4b]`}>
                Уведомления
              </span>
            </button>
          </div>
        )}

        {/* Profile with user name */}
        <Link
          href="/profile"
          className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          }`}
          onClick={onCloseMobileMenu}
        >
          <span 
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] transition-opacity duration-200 ${
              isActive('/profile') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
            } ${isMobile ? 'h-12' : 'h-10'}`}
          >
            <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
              <path 
                d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                stroke="#0d5c4b" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <User className={`transition-colors duration-200 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          } ${isActive('/profile') ? 'text-[#0d5c4b]' : ''} ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
          <span className={`transition-colors duration-200 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
          } group-hover:text-[#0d5c4b]`}>
            {userName || 'Профиль'}
          </span>
        </Link>
      </div>
    </>
  )
})

export function SidebarNavigation() {
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useDesignStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Состояние для уведомлений
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notificationsButtonRef = useRef<HTMLDivElement>(null)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)
  const mobileNotificationsPanelRef = useRef<HTMLDivElement>(null)
  
  // Позиция окна уведомлений (draggable)
  const [panelPosition, setPanelPosition] = useState(DEFAULT_POSITION)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  // Подсчёт непрочитанных
  const unreadCount = notifications.filter(n => !n.read).length

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

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDragging) return
      
      const target = event.target as Node
      const isInsideButton = notificationsButtonRef.current?.contains(target)
      const isInsideDesktopPanel = notificationsPanelRef.current?.contains(target)
      const isInsideMobilePanel = mobileNotificationsPanelRef.current?.contains(target)
      
      if (!isInsideButton && !isInsideDesktopPanel && !isInsideMobilePanel) {
        setIsNotificationsOpen(false)
      }
    }

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNotificationsOpen, isDragging])

  // Переключение панели уведомлений
  const toggleNotifications = useCallback(() => {
    setIsNotificationsOpen(prev => !prev)
  }, [])

  // Закрыть уведомления
  const closeNotifications = useCallback(() => {
    setIsNotificationsOpen(false)
  }, [])

  // Прочитать все (пока без функционала)
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Клик по уведомлению (пока без функционала, только закрытие)
  const handleNotificationClick = useCallback((notification: Notification) => {
    // Помечаем как прочитанное
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ))
    // Если есть orderId - переходим к заказу
    if (notification.orderId) {
      router.push(`/orders?id=${notification.orderId}`)
      closeNotifications()
    }
  }, [router, closeNotifications])

  // Стабильная ссылка на колбэк закрытия мобильного меню
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsNotificationsOpen(false)
  }, [pathname])

  // Блокируем скролл body при открытом меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Переход на главную страницу заказов
  const handleLogoClick = () => {
    setIsMobileMenuOpen(false)
    router.push('/orders')
  }

  const userName = user?.name || user?.login

  return (
    <>
      {/* Mobile Header */}
      <header className={`header-main md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 flex items-center justify-between px-6 transition-all ${
        isMobileMenuOpen ? '' : 'border-b border-gray-200 dark:border-gray-700'
      }`}>
        <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
          <Image 
            src={theme === 'dark' ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"} 
            alt="MasterCRM" 
            width={130} 
            height={36} 
            className="h-9 w-auto" 
            priority
          />
        </button>
        <div className="flex items-center gap-1">
          {/* Mobile Notifications Bell */}
          <div className="relative" ref={notificationsButtonRef}>
            <button
              onClick={toggleNotifications}
              className={`p-2 transition-colors relative ${
                isNotificationsOpen 
                  ? 'text-[#0d5c4b]' 
                  : theme === 'dark' ? 'text-gray-300 hover:text-[#0d5c4b]' : 'text-gray-600 hover:text-[#0d5c4b]'
              }`}
              aria-label="Уведомления"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Mobile Notifications Dropdown */}
            {isNotificationsOpen && (
              <div 
                ref={mobileNotificationsPanelRef}
                className="fixed left-4 right-4 top-20 bg-white dark:bg-[#252d3a] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[10000]"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Уведомления</h3>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-[#0d5c4b] hover:underline flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Прочитать все
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type)
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                            !notification.read ? 'bg-[#0d5c4b]/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {formatTime(notification.createdAt)}
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
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Нет уведомлений</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 transition-colors ${
              theme === 'dark' ? 'text-gray-300 hover:text-[#0d5c4b]' : 'text-gray-600 hover:text-[#0d5c4b]'
            }`}
            aria-label="Открыть меню"
          >
            {isMobileMenuOpen ? (
              <X className="h-7 w-7" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Full-screen Menu */}
      <aside 
        className={`sidebar-main md:hidden fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] z-[9998] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6 flex flex-col h-full overflow-y-auto">
          <MenuContent
            isMobile={true}
            pathname={pathname}
            theme={theme}
            toggleTheme={toggleTheme}
            userName={userName}
            onCloseMobileMenu={closeMobileMenu}
            onToggleNotifications={toggleNotifications}
            unreadCount={unreadCount}
          />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`sidebar-main hidden md:flex w-56 h-screen flex-col fixed left-0 top-0 border-r transition-colors duration-300 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {/* Logo - без разделительной линии */}
        <div className="p-6 pb-16">
          <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
            <Image 
              src={theme === 'dark' ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"} 
              alt="MasterCRM" 
              width={160} 
              height={45} 
              className="h-10 w-auto cursor-pointer" 
              priority
            />
          </button>
        </div>

        <MenuContent
          isMobile={false}
          pathname={pathname}
          theme={theme}
          toggleTheme={toggleTheme}
          userName={userName}
          onCloseMobileMenu={closeMobileMenu}
          onToggleNotifications={toggleNotifications}
          unreadCount={unreadCount}
        />
      </aside>

      {/* Desktop Notifications Panel - вынесено за пределы сайдбара */}
      {isNotificationsOpen && (
        <div 
          ref={notificationsPanelRef}
          className="hidden md:flex fixed w-96 max-h-96 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[9999] flex-col bg-white dark:bg-[#1e2736]"
          style={{ left: panelPosition.x, top: panelPosition.y }}
        >
          {/* Header - draggable */}
          <div 
            className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 cursor-move select-none"
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-4 w-4 text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Уведомления</h3>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                  className="text-xs text-[#0d5c4b] hover:underline flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Прочитать все
                </button>
              )}
            </div>
          </div>
          
          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1f2e]">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer ${
                      !notification.read 
                        ? 'bg-[#0d5c4b]/10 hover:bg-[#0d5c4b]/20' 
                        : 'bg-white dark:bg-[#1a1f2e] hover:bg-gray-50 dark:hover:bg-[#252d3a]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatTime(notification.createdAt)}
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
              <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Нет уведомлений</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
