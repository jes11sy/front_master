'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Редирект на страницу логина
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/25 mx-auto">
          <span className="text-white font-bold text-2xl">M</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Новые Схемы</h1>
        <p className="text-gray-300">Перенаправление...</p>
      </div>
    </div>
  )
}

