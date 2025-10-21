import { useEffect } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/api'

interface AuthGuardProps {
  children: React.ReactNode
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter()

  useEffect(() => {
    // Проверяем авторизацию только на клиенте
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      
      if (!token) {
        // Если нет токена, перенаправляем на логин
        router.push('/login')
      }
    }
  }, [router])

  // Если нет токена, не рендерим содержимое
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    if (!token) {
      return null
    }
  }

  return <>{children}</>
}

export default AuthGuard
