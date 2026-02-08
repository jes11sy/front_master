'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Sun, Moon, User, Menu, X } from 'lucide-react'

// Навигационные элементы с иконками
const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/images/navigate/orders.svg' },
  { name: 'Статистика', href: '/statistics', icon: '/images/images/navigate/reports.svg' },
  { name: 'Платежи', href: '/payments', icon: '/images/images/navigate/cash.svg' },
  { name: 'График работы', href: '/schedule', icon: '/images/images/navigate/employees.svg' },
]

export function Navigation() {
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useDesignStore()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Блокируем скролл body при открытом меню
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Проверка активности пункта меню
  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/orders' && pathname.startsWith(href + '/')) return true
    return false
  }

  const userName = user?.name || user?.login

  return (
    <>
      {/* Mobile Header */}
      <header className={`header-main md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 flex items-center justify-between px-6 transition-all ${
        mobileMenuOpen ? '' : 'border-b border-gray-200 dark:border-gray-700'
      }`}>
        <Link href="/orders" className="bg-transparent border-none cursor-pointer p-0">
          <Image 
            src={theme === 'dark' ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"} 
            alt="MasterCRM" 
            width={130} 
            height={36} 
            className="h-9 w-auto" 
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 transition-colors ${
              theme === 'dark' ? 'text-gray-300 hover:text-[#0d5c4b]' : 'text-gray-600 hover:text-[#0d5c4b]'
            }`}
            aria-label="Открыть меню"
          >
            {mobileMenuOpen ? (
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
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6 flex flex-col h-full overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 px-5 space-y-4">
            {navigationItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="nav-icon-hover relative flex items-center gap-3 px-3 py-3.5 text-base font-normal group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {/* Индикатор активной вкладки - тонкая скобка */}
                  <span 
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-12 transition-opacity duration-200 ${
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                    }`}
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
                    width={24} 
                    height={24} 
                    className={`nav-icon w-6 h-6 transition-all duration-200 ${active ? 'nav-icon-active' : ''}`}
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
          <div className="px-5 pb-6 space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center gap-3 px-3 py-3">
              <Sun className={`h-6 w-6 transition-colors ${theme === 'light' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
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
              <Moon className={`h-6 w-6 transition-colors ${theme === 'dark' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
            </div>

            {/* Profile with user name */}
            <Link
              href="/profile"
              className="nav-icon-hover relative flex items-center gap-3 px-3 py-3.5 text-base font-normal group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span 
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-12 transition-opacity duration-200 ${
                  isActive('/profile') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                }`}
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
              <User className={`h-6 w-6 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              } ${isActive('/profile') ? 'text-[#0d5c4b]' : ''}`} />
              <span className={`transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              } group-hover:text-[#0d5c4b]`}>
                {userName || 'Профиль'}
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Desktop Navigation */}
      <nav className="nav-main hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 border-b transition-colors duration-300">
        {/* Logo */}
        <Link href="/orders" className="flex items-center">
          <Image 
            src={theme === 'dark' ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"}
            alt="MasterCRM" 
            width={140} 
            height={32} 
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className="nav-icon-hover relative flex items-center gap-2 px-4 py-2 text-sm font-normal group"
              >
                {/* Индикатор активной вкладки - тонкая скобка снизу */}
                <span 
                  className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[6px] w-10 transition-opacity duration-200 ${
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                  }`}
                >
                  <svg viewBox="0 0 40 6" fill="none" className="w-full h-full">
                    <path 
                      d="M1 5C1 2.5 4.5 1 10 1h20c5.5 0 9 1.5 9 4" 
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
                  width={18} 
                  height={18} 
                  className={`nav-icon w-[18px] h-[18px] transition-all duration-200 ${active ? 'nav-icon-active' : ''}`}
                />
                <span className={`transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                } group-hover:text-[#0d5c4b]`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <div className="flex items-center gap-2">
            <Sun className={`h-4 w-4 transition-colors ${theme === 'light' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
            <button
              onClick={toggleTheme}
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-[#0d5c4b]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <Moon className={`h-4 w-4 transition-colors ${theme === 'dark' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
          </div>

          {/* Profile */}
          <Link
            href="/profile"
            className="nav-icon-hover relative flex items-center gap-2 px-3 py-2 text-sm font-normal group"
          >
            <span 
              className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[6px] w-10 transition-opacity duration-200 ${
                isActive('/profile') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
              }`}
            >
              <svg viewBox="0 0 40 6" fill="none" className="w-full h-full">
                <path 
                  d="M1 5C1 2.5 4.5 1 10 1h20c5.5 0 9 1.5 9 4" 
                  stroke="#0d5c4b" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
            <User className={`h-[18px] w-[18px] transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            } ${isActive('/profile') ? 'text-[#0d5c4b]' : ''}`} />
            <span className={`transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            } group-hover:text-[#0d5c4b]`}>
              {userName || 'Профиль'}
            </span>
          </Link>
        </div>
      </nav>
    </>
  )
}

export default Navigation
