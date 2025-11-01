import { useEffect } from 'react'
import { useRouter } from 'next/router'
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
        // Используем replace для мгновенного перенаправления без истории
        router.replace('/login')
      }
    }

    handleLogout()
  }, [router])

  // Возвращаем null для мгновенного редиректа
  return null
}

export default Logout
