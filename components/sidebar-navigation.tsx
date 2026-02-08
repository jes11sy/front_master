'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Sun, Moon, User, Menu, X, Bell } from 'lucide-react'
import apiClient from '@/lib/api'

// Навигационные элементы с иконками
const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/images/navigate/orders.svg' },
  { name: 'Статистика', href: '/statistics', icon: '/images/images/navigate/reports.svg' },
  { name: 'Платежи', href: '/payments', icon: '/images/images/navigate/cash.svg' },
  { name: 'График работы', href: '/schedule', icon: '/images/images/navigate/employees.svg' },
]

// Вынесено за пределы компонента, чтобы React не пересоздавал при каждом рендере
interface MenuContentProps {
  isMobile?: boolean
  pathname: string
  theme: string
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
}

const MenuContent = memo(function MenuContent({
  isMobile = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
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

        {/* Notifications - только в десктопном сайдбаре, placeholder для будущего функционала */}
        {!isMobile && (
          <button
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
            <Bell className={`h-5 w-5 transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <span className={`transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            } group-hover:text-[#0d5c4b]`}>
              Уведомления
            </span>
          </button>
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
  const { user, updateUser } = useAuthStore()
  const { theme, toggleTheme } = useDesignStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [masterName, setMasterName] = useState<string | null>(null)

  // Стабильная ссылка на колбэк закрытия мобильного меню
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  // Загружаем имя мастера из профиля
  useEffect(() => {
    const fetchMasterName = async () => {
      // Если имя уже есть в user, не загружаем
      if (user?.name) {
        setMasterName(user.name)
        return
      }
      
      try {
        const response = await apiClient.getMasterProfile()
        if (response.success && response.data?.name) {
          setMasterName(response.data.name)
          // Обновляем user в store
          updateUser({ name: response.data.name })
        }
      } catch (error) {
        // Игнорируем ошибки - используем login как fallback
      }
    }
    
    if (user) {
      fetchMasterName()
    }
  }, [user, updateUser])

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false)
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

  const userName = masterName || user?.name || user?.login

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
          {/* Notifications - placeholder для будущего функционала */}
          <button
            className={`p-2 transition-colors ${
              theme === 'dark' ? 'text-gray-300 hover:text-[#0d5c4b]' : 'text-gray-600 hover:text-[#0d5c4b]'
            }`}
            aria-label="Уведомления"
          >
            <Bell className="h-6 w-6" />
          </button>
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
        />
      </aside>
    </>
  )
}
