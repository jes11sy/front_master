'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/api'

const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '📋' },
  { name: 'Статистика', href: '/statistics', icon: '📊' },
  { name: 'Платежи', href: '/payments', icon: '💰' },
  { 
    name: 'Профиль', 
    icon: '👤',
    dropdown: [
      { name: 'Настройки профиля', href: '/profile' },
      { name: 'График работы', href: '/schedule' },
      { name: 'Выйти', href: '/logout' }
    ]
  },
]

interface SidebarNavigationProps {
  isOpen?: boolean
  onClose?: () => void
}

export function SidebarNavigation({ isOpen = false, onClose }: SidebarNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await apiClient.logout()
      router.push('/login')
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error)
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
    setExpandedDropdown(null)
    onClose && onClose()
  }

  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-lg border-r transition-all duration-300 z-50 ${
      isCollapsed ? 'w-16' : 'w-64'
    } max-md:w-64 max-md:transform ${isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`} style={{borderColor: '#14b8a6'}}>
      {/* Логотип */}
      <div className="p-4 border-b" style={{borderColor: '#14b8a6'}}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <Link href="/orders" className="flex items-center space-x-3 text-xl font-bold text-gray-800 hover:text-teal-600 transition-colors duration-200">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/images/logo.png?v=4" 
                  alt="Новые Схемы" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span>Новые Схемы</span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Навигационные элементы */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <div key={item.name}>
            {item.href ? (
              <Link
                href={item.href}
                className={`flex items-center px-3 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
                  pathname === item.href
                    ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500/30 shadow-md'
                    : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                }`}
                title={isCollapsed ? item.name : undefined}
                onClick={() => onClose && onClose()}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ) : (
              <div>
                <button
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
                    expandedDropdown === item.name
                      ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500/30 shadow-md'
                      : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                  }`}
                  onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  {!isCollapsed && (
                    <>
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
                    </>
                  )}
                </button>
                
                {/* Выпадающий список */}
                {item.dropdown && expandedDropdown === item.name && !isCollapsed && (
                  <div className="pl-4 mt-2 space-y-1">
                    {item.dropdown.map((dropdownItem) => (
                      <button
                        key={dropdownItem.name}
                        onClick={() => handleDropdownClick(dropdownItem.href)}
                        className={`block w-full text-left px-3 py-2 text-sm transition-colors duration-150 rounded-lg ${
                          pathname === dropdownItem.href
                            ? 'text-white bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-500 shadow-sm'
                            : dropdownItem.href === '/logout'
                            ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
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
      </nav>
    </div>
  )
}

export default SidebarNavigation
