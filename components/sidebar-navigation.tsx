'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
      { name: 'График работы', href: '/schedule' }
    ]
  },
]

export function SidebarNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)
  
  // Тема из store
  const { theme, toggleTheme } = useDesignStore()
  const isDark = theme === 'dark'

  const handleLogout = async () => {
    await apiClient.logout()
    router.push('/login')
  }

  // Проверка активности пункта меню
  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Проверка активности дропдауна
  const isDropdownActive = (dropdown?: { name: string; href: string }[]) => {
    if (!dropdown) return false
    return dropdown.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  }

  return (
    <>
      {/* Мобильная навигация сверху */}
      <nav className={`nav-main md:hidden fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-md border-b transition-colors duration-300`}>
        <div className="flex items-center justify-between px-4 py-4">
          {/* Логотип */}
          <Link href="/orders" className="flex items-center gap-3">
            <Image 
              src={isDark ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"}
              alt="MasterCRM" 
              width={140} 
              height={32} 
              className="h-8 w-auto"
              priority
            />
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Переключатель темы */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDark 
                  ? 'text-[#0d5c4b] hover:bg-[#2a3441]'
                  : 'text-[#0d5c4b] hover:bg-[#daece2]/50'
              }`}
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Гамбургер меню */}
            <button
              className={`p-2 rounded-lg transition-all duration-200 ${
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
          <div className={`border-t transition-colors ${
            isDark 
              ? 'bg-[#1e2530] border-[#0d5c4b]/30' 
              : 'bg-white border-[#0d5c4b]/20'
          }`}>
            <div className="px-4 py-4 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`nav-icon-hover flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
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
                      <span className="flex-1 text-left">{item.name}</span>
                    </Link>
                  ) : (
                    <div>
                      <button
                        className={`nav-icon-hover flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
                          expandedDropdown === item.name || isDropdownActive(item.dropdown)
                            ? 'nav-item-active text-white bg-[#0d5c4b] shadow-md'
                            : isDark
                              ? 'nav-item text-gray-300 hover:text-white hover:bg-[#2a3441]'
                              : 'nav-item text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                        }`}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        <img 
                          src={item.icon} 
                          alt="" 
                          className={`nav-icon w-5 h-5 mr-3 ${expandedDropdown === item.name || isDropdownActive(item.dropdown) ? 'nav-icon-active' : ''}`}
                        />
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
                          expandedDropdown === item.name ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {/* Выпадающий список для мобильных */}
                      {item.dropdown && expandedDropdown === item.name && (
                        <div className={`space-y-1 mt-2 ml-3 pl-4 ${
                          isDark ? 'border-l-2 border-[#0d5c4b]/30' : 'border-l-2 border-[#0d5c4b]/20'
                        }`}>
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className={`flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg ${
                                isActive(dropdownItem.href)
                                  ? 'text-white bg-[#0d5c4b] shadow-sm'
                                  : isDark
                                    ? 'text-gray-400 hover:text-white hover:bg-[#2a3441]'
                                    : 'text-gray-600 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {dropdownItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Кнопка выхода для мобильной версии */}
              <div className={`pt-2 mt-2 border-t ${isDark ? 'border-[#0d5c4b]/30' : 'border-gray-200'}`}>
                <button
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
                    isDark
                      ? 'text-gray-300 hover:text-red-400 hover:bg-red-500/10'
                      : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                  }`}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Десктопная боковая навигация */}
      <aside className={`sidebar-main hidden md:block fixed top-0 left-0 h-full w-64 z-50 shadow-lg backdrop-blur-md border-r transition-colors duration-300`}>
        <div className="flex flex-col h-full">
          {/* Логотип */}
          <div className={`p-6 border-b ${isDark ? 'border-[#0d5c4b]/30' : 'border-gray-200'}`}>
            <Link href="/orders" className="block">
              <Image 
                src={isDark ? "/images/images/logo_dark_v2.png" : "/images/images/logo_light_v2.png"}
                alt="MasterCRM" 
                width={160} 
                height={40} 
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Навигационные элементы */}
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <div key={item.name} className="relative">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`nav-icon-hover flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
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
                        className={`nav-icon w-5 h-5 mr-3 ${isActive(item.href) ? 'nav-icon-active' : ''}`}
                      />
                      <span className="flex-1 text-left">{item.name}</span>
                    </Link>
                  ) : (
                    <>
                      <button
                        className={`nav-icon-hover flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${
                          expandedDropdown === item.name || isDropdownActive(item.dropdown)
                            ? 'nav-item-active text-white bg-[#0d5c4b] shadow-md shadow-[#0d5c4b]/20'
                            : isDark
                              ? 'nav-item text-gray-300 hover:text-white hover:bg-[#2a3441]'
                              : 'nav-item text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                        }`}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        <img 
                          src={item.icon} 
                          alt="" 
                          className={`nav-icon w-5 h-5 mr-3 ${expandedDropdown === item.name || isDropdownActive(item.dropdown) ? 'nav-icon-active' : ''}`}
                        />
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                          expandedDropdown === item.name ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {/* Выпадающий список */}
                      {item.dropdown && expandedDropdown === item.name && (
                        <div className={`space-y-1 mt-2 ml-3 pl-4 ${
                          isDark ? 'border-l-2 border-[#0d5c4b]/30' : 'border-l-2 border-[#0d5c4b]/20'
                        }`}>
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className={`flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg ${
                                isActive(dropdownItem.href)
                                  ? 'text-white bg-[#0d5c4b] shadow-sm'
                                  : isDark
                                    ? 'text-gray-400 hover:text-white hover:bg-[#2a3441]'
                                    : 'text-gray-600 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                              }`}
                            >
                              {dropdownItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Нижняя секция: переключатель темы и выход */}
          <div className={`px-4 py-4 border-t space-y-2 ${isDark ? 'border-[#0d5c4b]/30' : 'border-gray-200'}`}>
            {/* Переключатель темы */}
            <button
              onClick={toggleTheme}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
                isDark
                  ? 'text-gray-300 hover:text-white hover:bg-[#2a3441]'
                  : 'text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
              {isDark ? 'Светлая тема' : 'Тёмная тема'}
            </button>

            {/* Кнопка выхода */}
            <button
              onClick={handleLogout}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
                isDark
                  ? 'text-gray-300 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Выйти
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
