'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const performLogout = async () => {
      // Выполняем logout асинхронно и ждем завершения
      await apiClient.logout()
      // Перенаправляем на логин только после очистки cookies
      router.replace('/login')
    }
    
    performLogout()
  }, [router])

  // Возвращаем null для мгновенного редиректа
  return null
}
