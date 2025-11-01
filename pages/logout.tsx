import { useEffect } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/api'

const Logout: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    // Выполняем logout синхронно
    apiClient.logout()
    // Сразу перенаправляем на логин
    router.replace('/login')
  }, [router])

  // Возвращаем null для мгновенного редиректа
  return null
}

export default Logout
