'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/api'

const navigationItems = [
  { name: 'Заказы', href: '/orders' },
  { name: 'Статистика', href: '/statistics' },
  { name: 'Платежи', href: '/payments' },
  { 
    name: 'Профиль', 
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
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      // Очищаем токены и данные авторизации
      await apiClient.logout()
      
      // Перенаправляем на страницу логина
      router.push('/login')
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error)
      // Даже если произошла ошибка, очищаем локальные данные и перенаправляем
      apiClient.clearToken()
      router.push('/login')
    }
  }

  const handleDropdownClick = (href: string) => {
    if (href === '/logout') {
      handleLogout()
    } else {
      router.push(href)
    }
    setMobileMenuOpen(false)
    setExpandedDropdown(null)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-lg border-b bg-white" style={{borderColor: '#14b8a6'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <Link href="/orders" className="flex items-center space-x-3 text-xl font-bold text-gray-800 nav-item-hover hover:text-teal-600 transition-colors duration-200">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/images/logo.png?v=4" 
                alt="Новые Схемы" 
                className="w-full h-full object-contain"
              />
            </div>
            <span>Новые Схемы</span>
          </Link>

          {/* Десктопная навигация */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => {
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout)
                    setHoverTimeout(null)
                  }
                  setHoveredItem(item.name)
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setHoveredItem(null)
                  }, 150)
                  setHoverTimeout(timeout)
                }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-lg ${
                      pathname === item.href
                        ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500/30 shadow-md'
                        : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                    }`}
                  >
                    {item.name}
                    {item.dropdown && (
                      <svg className="ml-1 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>
                ) : (
                  <div className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 text-gray-700 hover:text-teal-600 hover:bg-teal-50 cursor-pointer rounded-lg`}>
                    {item.name}
                    {item.dropdown && (
                      <svg className="ml-1 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )}
                
                {/* Выпадающий список для десктопа */}
                {item.dropdown && hoveredItem === item.name && (
                  <div 
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white rounded-lg shadow-xl border border-teal-200 z-50"
                    onMouseEnter={() => {
                      if (hoverTimeout) {
                        clearTimeout(hoverTimeout)
                        setHoverTimeout(null)
                      }
                    }}
                    onMouseLeave={() => {
                      const timeout = setTimeout(() => {
                        setHoveredItem(null)
                      }, 150)
                      setHoverTimeout(timeout)
                    }}
                  >
                    <div className="py-2">
                      {item.dropdown.map((dropdownItem, index) => (
                        <button
                          key={dropdownItem.name}
                          onClick={() => handleDropdownClick(dropdownItem.href)}
                          className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 rounded mx-2 ${
                            pathname === dropdownItem.href
                              ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500 shadow-sm'
                              : dropdownItem.href === '/logout'
                              ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                              : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                          }`}
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

          {/* Кнопка гамбургер-меню для мобильных */}
          <button
            className="md:hidden text-gray-700 hover:text-teal-600 hover:bg-teal-50 transition-colors duration-200 p-2 rounded-lg"
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

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white/95" style={{borderColor: '#14b8a6'}}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item, index) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 text-base font-medium transition-colors duration-200 rounded-lg ${
                        pathname === item.href
                          ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500/30 shadow-md'
                          : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className={`w-full text-left px-3 py-2 text-base font-medium transition-colors duration-200 flex items-center justify-between rounded-lg ${
                          expandedDropdown === item.name
                            ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500/30 shadow-md'
                            : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                        }`}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        {item.name}
                        {item.dropdown && (
                          <svg 
                            className={`h-4 w-4 transition-transform duration-300 ${
                              expandedDropdown === item.name ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Выпадающий список для мобильных */}
                      {item.dropdown && expandedDropdown === item.name && (
                        <div className="pl-4 space-y-1">
                          {item.dropdown.map((dropdownItem, dropdownIndex) => (
                            <button
                              key={dropdownItem.name}
                              onClick={() => handleDropdownClick(dropdownItem.href)}
                              className={`block w-full text-left px-3 py-2 text-sm transition-colors duration-150 rounded-lg ${
                                pathname === dropdownItem.href
                                  ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500 shadow-sm'
                                  : dropdownItem.href === '/logout'
                                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                  : 'text-gray-600 hover:text-teal-700 hover:bg-teal-50'
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
