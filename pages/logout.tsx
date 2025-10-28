import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import apiClient from '@/lib/api'

const Logout: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Очищаем токены и данные авторизации
        await apiClient.logout()
      } catch (error) {
        console.error('Ошибка при выходе из системы:', error)
        // Даже если произошла ошибка, очищаем локальные данные
        apiClient.clearToken()
      } finally {
        // Перенаправляем на страницу логина
        router.push('/login')
      }
    }

    handleLogout()
  }, [router])

  return null
}

export default Logout
