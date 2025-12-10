'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

export default function LogoutPage() {
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
