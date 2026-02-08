'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import apiClient from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { Sun, Moon, LogOut, ChevronDown } from 'lucide-react'

// Навигационные элементы с иконками
const navigationItems = [
  { 
    name: 'Заказы', 
    href: '/orders',
    icon: '/images/images/navigate/orders.svg'
  },
  { 
    name: 'Статистика', 
    href: '/statistics',
    icon: '/images/images/navigate/reports.svg'
  },
  { 
    name: 'Платежи', 
    href: '/payments',
    icon: '/images/images/navigate/cash.svg'
  },
  { 
    name: 'Профиль', 
    icon: '/images/images/navigate/employees.svg',
    dropdown: [
      { name: 'Настройки профиля', href: '/profile' },
      { name: 'График работы', href: '/schedule' },
      { name: 'Выйти', href: '/logout' }
    ]
  },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)
  
  // Тема из store
  const { theme, toggleTheme } = useDesignStore()
  const isDark = theme === 'dark'

  // Cleanup timeout при размонтировании
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [])

  const handleLogout = async () => {
    await apiClient.logout()
    router.push('/login')
  }

  const handleDropdownClick = (href: string) => {
    setMobileMenuOpen(false)
    setHoveredItem(null)
    
    if (href === '/logout') {
      handleLogout()
    } else {
      router.push(href)
    }
  }

  // Проверка активности пункта меню
  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="nav-main fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-md border-b transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <Link href="/orders" className="flex items-center">
            <Image 
              src={isDark ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"}
              alt="MasterCRM" 
              width={140} 
              height={32} 
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Десктопная навигация */}
          <div className="hidden md:flex items-center space-x-2">
            {navigationItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                    hoverTimeoutRef.current = null
                  }
                  setHoveredItem(item.name)
                }}
                onMouseLeave={() => {
                  hoverTimeoutRef.current = setTimeout(() => {
                    setHoveredItem(null)
                  }, 150)
                }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`nav-icon-hover inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                      isActive(item.href)
                        ? 'nav-item-active text-white bg-[#0d5c4b] shadow-md shadow-[#0d5c4b]/20'
                        : isDark 
                          ? 'nav-item text-gray-300 hover:text-white hover:bg-[#2a3441]'
                          : 'nav-item text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                    }`}
                  >
                    <img 
                      src={item.icon} 
                      alt="" 
                      className={`nav-icon w-4 h-4 mr-2 ${isActive(item.href) ? 'nav-icon-active' : ''}`}
                    />
                    {item.name}
                  </Link>
                ) : (
                  <div className={`nav-icon-hover inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${
                    isDark 
                      ? 'nav-item text-gray-300 hover:text-white hover:bg-[#2a3441]'
                      : 'nav-item text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                  }`}>
                    <img 
                      src={item.icon} 
                      alt="" 
                      className="nav-icon w-4 h-4 mr-2"
                    />
                    {item.name}
                    {item.dropdown && (
                      <ChevronDown className="ml-1 h-4 w-4 transition-transform duration-200" />
                    )}
                  </div>
                )}
                
                {/* Выпадающий список для десктопа */}
                {item.dropdown && hoveredItem === item.name && (
                  <div 
                    className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden ${
                      isDark 
                        ? 'bg-[#2a3441] border border-[#0d5c4b]/30'
                        : 'bg-white border border-[#0d5c4b]/20'
                    }`}
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current)
                        hoverTimeoutRef.current = null
                      }
                    }}
                    onMouseLeave={() => {
                      hoverTimeoutRef.current = setTimeout(() => {
                        setHoveredItem(null)
                      }, 150)
                    }}
                  >
                    <div className="py-2">
                      {item.dropdown.map((dropdownItem) => (
                        <button
                          key={dropdownItem.name}
                          onClick={() => handleDropdownClick(dropdownItem.href)}
                          className={`block w-full text-left px-4 py-2.5 text-sm transition-all duration-150 mx-2 rounded-lg ${
                            dropdownItem.href === '/logout'
                              ? isDark
                                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                              : isActive(dropdownItem.href)
                                ? 'text-white bg-[#0d5c4b] shadow-sm'
                                : isDark
                                  ? 'text-gray-300 hover:bg-[#1e2530] hover:text-white'
                                  : 'text-gray-700 hover:bg-[#daece2]/50 hover:text-[#0d5c4b]'
                          }`}
                          style={{ width: 'calc(100% - 16px)' }}
                        >
                          {dropdownItem.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Переключатель темы */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDark 
                  ? 'text-[#0d5c4b] hover:text-white hover:bg-[#2a3441]'
                  : 'text-[#0d5c4b] hover:bg-[#daece2]/50'
              }`}
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Кнопка гамбургер-меню для мобильных */}
            <button
              className={`md:hidden transition-all duration-200 p-2 rounded-lg ${
                isDark 
                  ? 'text-gray-300 hover:text-white hover:bg-[#2a3441]'
                  : 'text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${
            isDark 
              ? 'bg-[#1e2530] border-[#0d5c4b]/30' 
              : 'bg-white border-[#0d5c4b]/20'
          }`}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`nav-icon-hover flex items-center px-3 py-2.5 text-base font-medium transition-all duration-200 rounded-lg ${
                        isActive(item.href)
                          ? 'nav-item-active text-white bg-[#0d5c4b] shadow-md'
                          : isDark
                            ? 'nav-item text-gray-300 hover:text-white hover:bg-[#2a3441]'
                            : 'nav-item text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <img 
                        src={item.icon} 
                        alt="" 
                        className={`nav-icon w-5 h-5 mr-3 ${isActive(item.href) ? 'nav-icon-active' : ''}`}
                      />
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className={`nav-icon-hover w-full text-left px-3 py-2.5 text-base font-medium transition-all duration-200 flex items-center justify-between rounded-lg ${
                          expandedDropdown === item.name
                            ? 'nav-item-active text-white bg-[#0d5c4b] shadow-md'
                            : isDark
                              ? 'nav-item text-gray-300 hover:text-white hover:bg-[#2a3441]'
                              : 'nav-item text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                        }`}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        <span className="flex items-center">
                          <img 
                            src={item.icon} 
                            alt="" 
                            className={`nav-icon w-5 h-5 mr-3 ${expandedDropdown === item.name ? 'nav-icon-active' : ''}`}
                          />
                          {item.name}
                        </span>
                        {item.dropdown && (
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
                            expandedDropdown === item.name ? 'rotate-180' : ''
                          }`} />
                        )}
                      </button>
                      
                      {/* Выпадающий список для мобильных */}
                      {item.dropdown && expandedDropdown === item.name && (
                        <div className={`pl-4 mt-1 space-y-1 ${
                          isDark ? 'border-l-2 border-[#0d5c4b]/30 ml-3' : 'border-l-2 border-[#0d5c4b]/20 ml-3'
                        }`}>
                          {item.dropdown.map((dropdownItem) => (
                            <button
                              key={dropdownItem.name}
                              onClick={() => handleDropdownClick(dropdownItem.href)}
                              className={`block w-full text-left px-3 py-2 text-sm transition-all duration-150 rounded-lg ${
                                dropdownItem.href === '/logout'
                                  ? isDark
                                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                    : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                  : isActive(dropdownItem.href)
                                    ? 'text-white bg-[#0d5c4b] shadow-sm'
                                    : isDark
                                      ? 'text-gray-400 hover:text-white hover:bg-[#2a3441]'
                                      : 'text-gray-600 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                              }`}
                            >
                              {dropdownItem.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
