import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { ShoppingCart, BarChart3, CreditCard, User, Calendar, LogOut, ChevronDown } from 'lucide-react'
import apiClient from '@/lib/api'

const Navigation: React.FC = () => {
  const router = useRouter()
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Закрытие мобильного меню при изменении роута
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [router.pathname])

  const navItems = [
    {
      href: '/orders',
      label: 'Заказы',
      icon: ShoppingCart
    },
    {
      href: '/statistics',
      label: 'Статистика',
      icon: BarChart3
    },
    {
      href: '/payments',
      label: 'Платежи',
      icon: CreditCard
    }
  ]

  const profileMenuItems = [
    {
      href: '/profile',
      label: 'Профиль',
      icon: User
    },
    {
      href: '/schedule',
      label: 'График работы',
      icon: Calendar
    }
  ]

  return (
    <nav className="bg-black/90 backdrop-blur-sm border-b border-gray-800 fixed top-0 left-0 right-0 z-[10000]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/orders" className="flex items-center space-x-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="/images/logo.png?v=4" 
                alt="Новые Схемы" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-white">Новые Схемы</span>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href
              const Icon = item.icon
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`${
                      isActive
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    } transition-all duration-300`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
            
            {/* Profile Dropdown */}
            <div className="relative z-[10001]" ref={dropdownRef}>
              <Button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                variant="ghost"
                className={`${
                  router.pathname === '/profile' || router.pathname === '/schedule'
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                } transition-all duration-300`}
              >
                <User className="h-4 w-4 mr-2" />
                Профиль
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              
              {isProfileDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-[10002]">
                  <div className="py-2">
                    {profileMenuItems.map((item) => {
                      const isActive = router.pathname === item.href
                      const Icon = item.icon
                      
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            className={`flex items-center px-4 py-2 text-sm cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-green-600/20 text-green-300'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            {item.label}
                          </div>
                        </Link>
                      )
                    })}
                    <div className="border-t border-gray-700 my-1"></div>
                    <div
                      className="flex items-center px-4 py-2 text-sm text-red-300 hover:bg-red-900/20 hover:text-red-400 cursor-pointer transition-colors"
                      onClick={() => {
                        handleLogout()
                        setIsProfileDropdownOpen(false)
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Выйти
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-2">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href
            const Icon = item.icon
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  } transition-all duration-300`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
          
          {/* Mobile Profile Section */}
          <div className="border-t border-gray-700 pt-2">
            <div className="text-gray-400 text-xs font-medium px-3 py-2">Профиль</div>
            {profileMenuItems.map((item) => {
              const isActive = router.pathname === item.href
              const Icon = item.icon
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    } transition-all duration-300`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
            
            {/* Mobile Logout Button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-red-300 hover:text-red-400 hover:bg-red-900/20 transition-all duration-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
