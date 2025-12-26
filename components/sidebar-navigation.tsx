'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

const navigationItems = [
  { name: 'Заказы', href: '/orders' },
  { name: 'Статистика', href: '/statistics' },
  { name: 'Платежи', href: '/payments' },
  { 
    name: 'Профиль', 
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

  const handleLogout = async () => {
    // Выполняем logout асинхронно и ждем завершения
    await apiClient.logout()
    // Перенаправляем на логин только после очистки cookies
    router.push('/login')
  }

  return (
    <>
      {/* Мобильная навигация сверху */}
      <nav 
        className="md:hidden fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-lg border-b"
        style={{
          backgroundColor: 'white',
          borderColor: '#14b8a6',
          borderBottomWidth: '2px'
        }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Link 
              href="/orders" 
              className="text-lg font-bold transition-colors duration-200"
              style={{
                color: '#374151',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#14b8a6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#374151'
              }}
            >
              Новые Схемы
            </Link>
          </div>
          
          <button
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              color: '#374151'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#14b8a6'
              e.currentTarget.style.backgroundColor = '#f0fdfa'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#374151'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
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
          <div 
            className="border-t bg-white"
            style={{
              borderColor: '#14b8a6',
              borderTopWidth: '2px'
            }}
          >
            <div className="px-4 py-4 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                      style={{
                        color: pathname === item.href ? 'white' : '#374151',
                        backgroundColor: pathname === item.href ? '#14b8a6' : 'transparent',
                        textDecoration: 'none',
                        boxShadow: pathname === item.href ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#14b8a6'
                          e.currentTarget.style.backgroundColor = '#f0fdfa'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#374151'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.dropdown && (
                        <svg className="ml-2 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                        style={{
                          color: expandedDropdown === item.name ? 'white' : '#374151',
                          backgroundColor: expandedDropdown === item.name ? '#14b8a6' : 'transparent',
                          textDecoration: 'none',
                          boxShadow: expandedDropdown === item.name ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (expandedDropdown !== item.name) {
                            e.currentTarget.style.color = '#14b8a6'
                            e.currentTarget.style.backgroundColor = '#f0fdfa'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedDropdown !== item.name) {
                            e.currentTarget.style.color = '#374151'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        <span className="flex-1 text-left">{item.name}</span>
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
                        <div className="space-y-1 mt-2">
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className="flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg"
                              style={{
                                color: pathname === dropdownItem.href ? 'white' : '#6b7280',
                                backgroundColor: pathname === dropdownItem.href ? '#14b8a6' : 'transparent',
                                textDecoration: 'none',
                                boxShadow: pathname === dropdownItem.href ? '0 1px 2px rgba(20, 184, 166, 0.3)' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (pathname !== dropdownItem.href) {
                                  e.currentTarget.style.color = '#14b8a6'
                                  e.currentTarget.style.backgroundColor = '#f0fdfa'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (pathname !== dropdownItem.href) {
                                  e.currentTarget.style.color = '#6b7280'
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }
                              }}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <span className="flex-1 text-left">{dropdownItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Кнопка выхода для мобильной версии */}
              <div className="pt-2 mt-2 border-t" style={{borderColor: '#e5e7eb'}}>
                <button
                  className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                  style={{
                    color: '#374151',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626'
                    e.currentTarget.style.backgroundColor = '#fef2f2'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#374151'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Десктопная боковая навигация */}
      <nav 
        className="hidden md:block fixed top-0 left-0 h-full w-64 z-50 shadow-lg backdrop-blur-lg border-r"
        style={{
          backgroundColor: 'white',
          borderColor: '#14b8a6',
          borderRightWidth: '2px'
        }}
      >
        <div className="flex flex-col h-full">
        {/* Логотип */}
        <div className="p-6 border-b" style={{borderColor: '#e5e7eb'}}>
          <Link 
            href="/orders" 
            className="text-xl font-bold transition-colors duration-200 block"
            style={{
              color: '#374151',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#14b8a6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#374151'
            }}
          >
            Новые Схемы
          </Link>
        </div>

        {/* Навигационные элементы */}
        <div className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <div
                key={item.name}
                className="relative"
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-teal-50 hover:text-teal-600"
                    style={{
                      color: pathname === item.href ? 'white' : '#374151',
                      backgroundColor: pathname === item.href ? '#14b8a6' : 'transparent',
                      textDecoration: 'none',
                      boxShadow: pathname === item.href ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                    }}
                  >
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.dropdown && (
                      <svg className="ml-2 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>
                ) : (
                  <>
                    <button
                      className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg hover:bg-teal-50 hover:text-teal-600"
                      style={{
                        color: expandedDropdown === item.name ? 'white' : '#374151',
                        backgroundColor: expandedDropdown === item.name ? '#14b8a6' : 'transparent',
                        textDecoration: 'none'
                      }}
                      onClick={() => {
                        setExpandedDropdown(expandedDropdown === item.name ? null : item.name)
                      }}
                    >
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.dropdown && (
                        <svg 
                          className={`ml-2 h-4 w-4 transition-transform duration-200 ${expandedDropdown === item.name ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Выпадающий список для десктопа (снизу) */}
                    {item.dropdown && expandedDropdown === item.name && (
                      <div className="space-y-1 mt-2">
                        {item.dropdown.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.name}
                            href={dropdownItem.href}
                            className="flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg"
                            style={{
                              color: pathname === dropdownItem.href ? 'white' : '#6b7280',
                              backgroundColor: pathname === dropdownItem.href ? '#14b8a6' : 'transparent',
                              textDecoration: 'none',
                              boxShadow: pathname === dropdownItem.href ? '0 1px 2px rgba(20, 184, 166, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (pathname !== dropdownItem.href) {
                                e.currentTarget.style.color = '#14b8a6'
                                e.currentTarget.style.backgroundColor = '#f0fdfa'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (pathname !== dropdownItem.href) {
                                e.currentTarget.style.color = '#6b7280'
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }
                            }}
                          >
                            <span className="flex-1 text-left">{dropdownItem.name}</span>
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

        {/* Кнопка выхода для десктопа */}
        <div className="px-4 py-4 border-t" style={{borderColor: '#e5e7eb'}}>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-red-50 hover:text-red-600"
            style={{
              color: '#374151',
              textDecoration: 'none'
            }}
          >
            <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйти
          </button>
        </div>
      </div>
    </nav>
    </>
  )
}
